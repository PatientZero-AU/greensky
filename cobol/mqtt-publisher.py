#!/usr/bin/env python3
"""
GreenSky MQTT Publisher

Fetches live flight data from adsb.lol for Australian airspace
and publishes to MQTT topic greensky/flights.

Smart mode: only fetches when viewers are connected (via presence pings).
Always publishes with retain=True so new subscribers get instant data.
Fetches immediately when first viewer appears after idle.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

MQTT_BROKER = os.environ.get("MQTT_BROKER", "mosquitto.barleycorn.svc.cluster.local")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = "greensky/flights"
MQTT_PRESENCE_TOPIC = "greensky/viewers"
FETCH_INTERVAL = int(os.environ.get("FETCH_INTERVAL", "120"))
VIEWER_TIMEOUT = 90  # seconds before considering viewers gone
IDLE_POLL = 5  # seconds between checks when idle

ADSB_URL = "https://api.adsb.lol/v2/lat/-25.27/lon/133.77/dist/2000"

last_viewer_ping = 0


def on_message(client, userdata, msg, properties=None):
    global last_viewer_ping
    if msg.topic == MQTT_PRESENCE_TOPIC:
        last_viewer_ping = time.time()
        print(f"[INFO] Viewer ping received", file=sys.stderr, flush=True)


def has_viewers():
    return (time.time() - last_viewer_ping) < VIEWER_TIMEOUT


def fetch_flights():
    try:
        result = subprocess.run(
            ["curl", "-sf", "--max-time", "15", ADSB_URL],
            capture_output=True, text=True, timeout=20
        )
        if result.returncode != 0:
            return None
        return json.loads(result.stdout)
    except Exception as e:
        print(f"[ERROR] Fetch failed: {e}", file=sys.stderr, flush=True)
        return None


def process_flights(data):
    if not data or "ac" not in data:
        return {"timestamp": datetime.now(timezone.utc).isoformat(), "flights": []}

    flights = []
    for ac in data["ac"]:
        callsign = (ac.get("flight") or "").strip()
        lat = ac.get("lat")
        lon = ac.get("lon")

        if lat is None or lon is None or not callsign:
            continue
        if not (-45 <= lat <= -9 and 110 <= lon <= 155):
            continue

        prefix = callsign[:3].upper()
        if prefix not in ("QFA", "VOZ", "VAU", "JST", "QJE"):
            continue

        flights.append({
            "callsign": callsign,
            "lat": round(float(lat), 3),
            "lon": round(float(lon), 3),
            "altitude": 0 if ac.get("alt_baro") == "ground" else round(float(ac.get("alt_baro", 0) or 0), 0),
            "velocity": round(float(ac.get("gs", 0) or 0), 1),
            "heading": round(float(ac.get("track", 0) or 0), 1),
            "origin": "",
            "on_ground": bool(ac.get("alt_baro") == "ground"),
        })

    return {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "flights": flights,
    }


def publish(client):
    raw = fetch_flights()
    if raw:
        processed = process_flights(raw)
        payload = json.dumps(processed)
        client.publish(MQTT_TOPIC, payload, qos=0, retain=True)
        count = len(processed.get("flights", []))
        print(f"[INFO] Published {count} flights", file=sys.stderr, flush=True)
    else:
        print("[WARN] No data, skipping", file=sys.stderr, flush=True)


def main():
    global last_viewer_ping

    print("[INFO] GreenSky MQTT Publisher starting...", file=sys.stderr, flush=True)
    print(f"[INFO] Broker: {MQTT_BROKER}:{MQTT_PORT}", file=sys.stderr, flush=True)
    print(f"[INFO] Fetch interval: {FETCH_INTERVAL}s (when viewers active)", file=sys.stderr, flush=True)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="greensky-publisher")
    client.on_message = on_message

    connected = False
    while not connected:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            client.loop_start()
            result = client.subscribe(MQTT_PRESENCE_TOPIC, qos=0)
            connected = True
            print(f"[INFO] Connected to MQTT broker", file=sys.stderr, flush=True)
            print(f"[INFO] Subscribed to {MQTT_PRESENCE_TOPIC}: {result}", file=sys.stderr, flush=True)
        except Exception as e:
            print(f"[WARN] Connect failed: {e}", file=sys.stderr, flush=True)
            time.sleep(5)

    # Initial fetch so retained message exists
    print("[INFO] Initial fetch for retained message...", file=sys.stderr, flush=True)
    publish(client)

    last_fetch = time.time()
    was_idle = True

    while True:
        now = time.time()

        if has_viewers():
            if was_idle:
                print("[INFO] Viewer connected — fetching immediately", file=sys.stderr, flush=True)
                publish(client)
                last_fetch = now
                was_idle = False
            elif (now - last_fetch) >= FETCH_INTERVAL:
                publish(client)
                last_fetch = now
            time.sleep(IDLE_POLL)
        else:
            if not was_idle:
                print("[INFO] No viewers — idling", file=sys.stderr, flush=True)
                was_idle = True
            time.sleep(IDLE_POLL)


if __name__ == "__main__":
    main()

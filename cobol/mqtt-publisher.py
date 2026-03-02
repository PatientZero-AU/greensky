#!/usr/bin/env python3
"""
GreenSky MQTT Publisher

Fetches live flight data from adsb.lol API for Australian airspace
and publishes to MQTT topic greensky/flights.

Smart fetching: only calls the API when MQTT subscribers are connected.
When nobody is viewing, the publisher idles — saving API quota.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

# Configuration
MQTT_BROKER = os.environ.get("MQTT_BROKER", "mosquitto.barleycorn.svc.cluster.local")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
MQTT_TOPIC = "greensky/flights"
MQTT_PRESENCE_TOPIC = "greensky/viewers"
FETCH_INTERVAL = int(os.environ.get("FETCH_INTERVAL", "60"))
IDLE_CHECK_INTERVAL = 10

# adsb.lol API — centre of Australia, 2000km radius
ADSB_URL = "https://api.adsb.lol/v2/lat/-25.27/lon/133.77/dist/2000"

# Track active viewers
viewer_count = 0
last_viewer_ping = 0


def on_message(client, userdata, msg):
    """Handle viewer presence messages."""
    global viewer_count, last_viewer_ping
    try:
        data = json.loads(msg.payload)
        if data.get("action") == "viewing":
            last_viewer_ping = time.time()
            viewer_count = max(1, data.get("count", 1))
    except (json.JSONDecodeError, Exception):
        pass


def has_active_viewers():
    """Check if anyone has pinged in the last 90 seconds."""
    return (time.time() - last_viewer_ping) < 90


def fetch_flights():
    """Fetch flight data from adsb.lol API."""
    try:
        result = subprocess.run(
            ["curl", "-sf", "--max-time", "15", ADSB_URL],
            capture_output=True, text=True, timeout=20
        )
        if result.returncode != 0:
            print(f"[WARN] adsb.lol returned non-zero: {result.returncode}", file=sys.stderr)
            return None
        return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        print(f"[ERROR] Fetch failed: {e}", file=sys.stderr)
        return None


def process_flights(data):
    """Process adsb.lol response into GreenSky format."""
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


def main():
    print("[INFO] GreenSky MQTT Publisher starting...", file=sys.stderr)
    print(f"[INFO] Broker: {MQTT_BROKER}:{MQTT_PORT}", file=sys.stderr)
    print(f"[INFO] Topic: {MQTT_TOPIC}", file=sys.stderr)
    print(f"[INFO] Fetch interval: {FETCH_INTERVAL}s (only when viewers active)", file=sys.stderr)
    print(f"[INFO] Data source: adsb.lol", file=sys.stderr)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="greensky-publisher")
    client.on_message = on_message

    connected = False
    while not connected:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            client.loop_start()
            client.subscribe(MQTT_PRESENCE_TOPIC, qos=0)
            connected = True
            print("[INFO] Connected to MQTT broker", file=sys.stderr)
        except Exception as e:
            print(f"[WARN] MQTT connection failed, retrying in 5s: {e}", file=sys.stderr)
            time.sleep(5)

    # Always do one initial fetch so retained message is available
    print("[INFO] Initial fetch for retained message...", file=sys.stderr)
    raw = fetch_flights()
    if raw:
        processed = process_flights(raw)
        payload = json.dumps(processed)
        client.publish(MQTT_TOPIC, payload, qos=0, retain=True)
        flight_count = len(processed.get("flights", []))
        print(f"[INFO] Initial publish: {flight_count} flights (retained)", file=sys.stderr)

    last_fetch = time.time()
    idle_logged = False

    while True:
        now = time.time()

        if has_active_viewers():
            # If we were idle, fetch immediately on first viewer
            if idle_logged:
                last_fetch = 0  # force immediate fetch
            idle_logged = False
            if (now - last_fetch) >= FETCH_INTERVAL:
                try:
                    raw = fetch_flights()
                    if raw:
                        processed = process_flights(raw)
                        payload = json.dumps(processed)
                        client.publish(MQTT_TOPIC, payload, qos=0, retain=True)
                        flight_count = len(processed.get("flights", []))
                        print(f"[INFO] Published {flight_count} flights ({viewer_count} viewer(s))", file=sys.stderr)
                    else:
                        print("[WARN] No data, skipping publish", file=sys.stderr)
                except Exception as e:
                    print(f"[ERROR] Publish error: {e}", file=sys.stderr)
                last_fetch = now
            time.sleep(5)
        else:
            if not idle_logged:
                print("[INFO] No active viewers — idling (saving API quota)", file=sys.stderr)
                idle_logged = True
            time.sleep(IDLE_CHECK_INTERVAL)


if __name__ == "__main__":
    main()

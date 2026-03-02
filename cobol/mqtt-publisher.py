#!/usr/bin/env python3
"""
GreenSky MQTT Publisher

Fetches live flight data from adsb.lol API for Australian airspace,
and publishes to MQTT topic greensky/flights.

Uses adsb.lol — a free, open ADS-B aggregator with no auth required.
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
FETCH_INTERVAL = int(os.environ.get("FETCH_INTERVAL", "30"))

# adsb.lol API — centre of Australia, 2000km radius covers the continent
ADSB_URL = "https://api.adsb.lol/v2/lat/-25.27/lon/133.77/dist/2000"


def fetch_flights():
    """Fetch flight data from adsb.lol API."""
    try:
        result = subprocess.run(
            ["curl", "-sf", "--max-time", "15", ADSB_URL],
            capture_output=True, text=True, timeout=20
        )
        if result.returncode != 0:
            print(f"[WARN] adsb.lol API returned non-zero: {result.returncode}", file=sys.stderr)
            return None
        return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        print(f"[ERROR] Failed to fetch flight data: {e}", file=sys.stderr)
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

        # Skip entries missing position or callsign
        if lat is None or lon is None or not callsign:
            continue

        # Filter to Australian bounding box (generous)
        if not (-45 <= lat <= -9 and 110 <= lon <= 155):
            continue

        flights.append({
            "callsign": callsign,
            "lat": round(float(lat), 3),
            "lon": round(float(lon), 3),
            "altitude": round(float(ac.get("alt_baro", 0) or 0), 0),
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
    print(f"[INFO] Interval: {FETCH_INTERVAL}s", file=sys.stderr)
    print(f"[INFO] Data source: adsb.lol", file=sys.stderr)

    # Connect to MQTT
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="greensky-publisher")

    connected = False
    while not connected:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            client.loop_start()
            connected = True
            print("[INFO] Connected to MQTT broker", file=sys.stderr)
        except Exception as e:
            print(f"[WARN] MQTT connection failed, retrying in 5s: {e}", file=sys.stderr)
            time.sleep(5)

    # Main loop
    while True:
        try:
            raw = fetch_flights()
            if raw:
                processed = process_flights(raw)
                payload = json.dumps(processed)
                client.publish(MQTT_TOPIC, payload, qos=0)
                flight_count = len(processed.get("flights", []))
                print(f"[INFO] Published {flight_count} flights", file=sys.stderr)
            else:
                print("[WARN] No data, skipping publish", file=sys.stderr)
        except Exception as e:
            print(f"[ERROR] Publish loop error: {e}", file=sys.stderr)

        time.sleep(FETCH_INTERVAL)


if __name__ == "__main__":
    main()

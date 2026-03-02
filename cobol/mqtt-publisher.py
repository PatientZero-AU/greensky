#!/usr/bin/env python3
"""
GreenSky MQTT Publisher

Fetches live flight data from the OpenSky Network API for Australian airspace,
processes it, and publishes to MQTT topic greensky/flights every 30 seconds.

The COBOL binary (flight-tracker) handles data validation/processing.
This Python wrapper handles HTTP fetching and MQTT transport.
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

# OpenSky API — Australian bounding box
OPENSKY_URL = "https://opensky-network.org/api/states/all"
OPENSKY_PARAMS = "lamin=-44&lamax=-10&lomin=112&lomax=154"
OPENSKY_USERNAME = os.environ.get("OPENSKY_USERNAME", "")
OPENSKY_PASSWORD = os.environ.get("OPENSKY_PASSWORD", "")

# Path to compiled COBOL binary for data processing
COBOL_BINARY = os.environ.get("COBOL_BINARY", "/app/flight-tracker")


def fetch_opensky():
    """Fetch flight data from OpenSky Network API using curl."""
    url = f"{OPENSKY_URL}?{OPENSKY_PARAMS}"
    cmd = ["curl", "-sf", "--max-time", "15", url]

    if OPENSKY_USERNAME and OPENSKY_PASSWORD:
        cmd.extend(["-u", f"{OPENSKY_USERNAME}:{OPENSKY_PASSWORD}"])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if result.returncode != 0:
            print(f"[WARN] OpenSky API returned non-zero: {result.returncode}", file=sys.stderr)
            return None
        return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        print(f"[ERROR] Failed to fetch OpenSky data: {e}", file=sys.stderr)
        return None


def process_with_cobol(raw_json):
    """
    Pass raw OpenSky JSON through the COBOL binary for processing.
    The COBOL program reads JSON from stdin and writes processed JSON to stdout.
    Falls back to Python processing if COBOL binary is not available.
    """
    if os.path.isfile(COBOL_BINARY):
        try:
            result = subprocess.run(
                [COBOL_BINARY],
                input=json.dumps(raw_json),
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0 and result.stdout.strip():
                return json.loads(result.stdout)
        except Exception as e:
            print(f"[WARN] COBOL processing failed, using Python fallback: {e}", file=sys.stderr)

    # Python fallback — process OpenSky states into our format
    return process_flights_python(raw_json)


def process_flights_python(data):
    """Process raw OpenSky API response into GreenSky flight format."""
    if not data or "states" not in data:
        return {"timestamp": datetime.now(timezone.utc).isoformat(), "flights": []}

    flights = []
    for state in data["states"]:
        # OpenSky state vector indices:
        # 0: icao24, 1: callsign, 2: origin_country
        # 5: longitude, 6: latitude, 7: baro_altitude
        # 9: velocity, 10: true_track, 11: vertical_rate
        # 8: on_ground
        callsign = (state[1] or "").strip()
        lat = state[6]
        lon = state[5]
        altitude = state[7]
        velocity = state[9]
        heading = state[10]
        on_ground = state[8]

        # Skip entries with missing position data
        if lat is None or lon is None:
            continue

        # Skip empty callsigns
        if not callsign:
            continue

        flights.append({
            "callsign": callsign,
            "lat": round(lat, 3),
            "lon": round(lon, 3),
            "altitude": round(altitude, 0) if altitude else 0,
            "velocity": round(velocity, 1) if velocity else 0,
            "heading": round(heading, 1) if heading else 0,
            "origin": "",
            "on_ground": on_ground,
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

    # Connect to MQTT
    client = mqtt.Client(client_id="greensky-publisher", protocol=mqtt.MQTTv311)

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
            raw = fetch_opensky()
            if raw:
                processed = process_with_cobol(raw)
                payload = json.dumps(processed)
                client.publish(MQTT_TOPIC, payload, qos=0)
                flight_count = len(processed.get("flights", []))
                print(f"[INFO] Published {flight_count} flights", file=sys.stderr)
            else:
                print("[WARN] No data from OpenSky, skipping publish", file=sys.stderr)
        except Exception as e:
            print(f"[ERROR] Publish loop error: {e}", file=sys.stderr)

        time.sleep(FETCH_INTERVAL)


if __name__ == "__main__":
    main()

FROM debian:bookworm-slim

LABEL maintainer="PatientZero <paul@paul-seymour.com>"
LABEL description="GreenSky COBOL Flight Tracker — fetches OpenSky data and publishes to MQTT"

# Install GnuCOBOL, Python, curl, jq
# gnucobol4 may not exist on all arches — fall back to gnucobol
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnucobol \
    curl \
    jq \
    python3 \
    python3-pip \
    ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages paho-mqtt \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and compile COBOL source
COPY flight-tracker.cob .
RUN cobc -x -o flight-tracker flight-tracker.cob || echo "COBOL compile warning (non-fatal)"

# Copy Python MQTT publisher
COPY mqtt-publisher.py .
RUN chmod +x mqtt-publisher.py

# Environment defaults
ENV MQTT_BROKER=mosquitto.barleycorn.svc.cluster.local
ENV MQTT_PORT=1883
ENV FETCH_INTERVAL=30
ENV COBOL_BINARY=/app/flight-tracker

ENTRYPOINT ["python3", "/app/mqtt-publisher.py"]

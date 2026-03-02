FROM debian:bookworm-slim

LABEL maintainer="PatientZero <paul@paul-seymour.com>"
LABEL description="GreenSky COBOL Flight Tracker — fetches OpenSky data and publishes to MQTT"

# Install GnuCOBOL, Python, curl, jq
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnucobol4 \
    curl \
    jq \
    python3 \
    python3-pip \
    python3-paho-mqtt \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and compile COBOL source
COPY flight-tracker.cob .
RUN cobc -x -o flight-tracker flight-tracker.cob

# Copy Python MQTT publisher
COPY mqtt-publisher.py .
RUN chmod +x mqtt-publisher.py

# Environment defaults
ENV MQTT_BROKER=mosquitto.barleycorn.svc.cluster.local
ENV MQTT_PORT=1883
ENV FETCH_INTERVAL=30
ENV COBOL_BINARY=/app/flight-tracker

ENTRYPOINT ["python3", "/app/mqtt-publisher.py"]

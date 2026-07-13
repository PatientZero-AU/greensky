# GreenSky — CLAUDE.md

Live Australian flights from COBOL backend, CRT green-screen canvas. K3s-deployed.

## Architecture
- COBOL container -> OpenSky API every 30s -> MQTT topic greensky/flights
- Next.js container -> WebSocket (mqtt.js) -> HTML5 canvas CRT render
- Broker: mosquitto.barleycorn.svc.cluster.local (1883 / 9001 WS)
- Namespace: greensky

## Hard rules
- Docker-only builds — ARM64 cross-compile (build amd64, runtime arm64)
- Cloudflare tunnel ingress only
- Registry: registry2.palmtech.com.au/greensky-<service>:latest
- MQTT QoS 0 — flight data is ephemeral

## Related
@~/source/grubot-brain/wiki/infrastructure/k3s-cluster.md

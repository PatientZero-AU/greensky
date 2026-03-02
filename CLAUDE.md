# CLAUDE.md — GreenSky

## What This Is
A Next.js web application that displays live Australian flight data from a COBOL backend, styled as a retro CRT green-screen monitor. The COBOL app publishes flight positions to MQTT; the web app subscribes and renders them on a canvas.

This runs on a Raspberry Pi 5 K3s cluster — and the page makes that obvious.

## Immutable Rules

### Docker-Only Builds
All dev/build work MUST use Docker. Never run native builds on the host.

### K8s Ingress — ALWAYS Use Cloudflare Tunnel
All public-facing services MUST use `ingressClassName: cloudflare-tunnel`.
Required annotation: `cloudflare-tunnel-ingress-controller.strrl.dev/backend-protocol: http`

## Architecture

```
COBOL container:
  - Fetches flight data from OpenSky Network API every 30s
  - Publishes JSON to MQTT topic `greensky/flights`
  - Topic: { flights: [{ callsign, lat, lon, altitude, velocity, heading }] }

Mosquitto broker (already running):
  - ClusterIP service: mosquitto.barleycorn.svc.cluster.local:1883
  - WebSocket port: 9001

Next.js container:
  - Serves the CRT wrapper page (SSR for SEO)
  - Client-side: connects to MQTT via WebSocket (mqtt.js)
  - Renders flights on HTML5 Canvas styled as green phosphor CRT
  - Canvas draws: Australia coastline outline, flight positions as dots with callsigns, city labels
```

## MQTT Details
- **Broker**: `mosquitto.barleycorn.svc.cluster.local` port 1883 (internal), port 9001 (WebSocket)
- **Public WebSocket**: Needs to be exposed via the ingress at `/mqtt/` path
- **Topic**: `greensky/flights`
- **QoS**: 0 (fire and forget — flight data is ephemeral)
- **Message format**:
```json
{
  "timestamp": "2026-03-02T03:30:00Z",
  "flights": [
    {
      "callsign": "QFA401",
      "lat": -33.946,
      "lon": 151.177,
      "altitude": 35000,
      "velocity": 450,
      "heading": 270,
      "origin": "SYD",
      "on_ground": false
    }
  ]
}
```

## Design Requirements

### CRT Monitor Aesthetic
- Chunky plastic bezel frame (dark grey, subtle lighting gradients)
- Green phosphor text and graphics (#33ff33)
- Scanlines overlay (subtle, 1-2px repeating)
- Phosphor glow effect (text-shadow / box-shadow)
- Vignette (darkened edges)
- Screen reflection highlight (radial gradient)
- Flicker animation (very subtle opacity variation)
- Power LED (green, pulsing) bottom-right of bezel
- "PatientZero™" badge bottom-left of bezel
- "Model CRT-K3S" label on bezel

### Canvas Map
- Draw Australia coastline as green dots/lines on black background
- Flight positions as bright green dots with callsign labels
- Movement trails (fade effect showing direction)
- City labels for major airports (SYD, MEL, BNE, PER, ADL, CBR, HBA, DRW)
- Flight count display
- UTC timestamp of last update
- All rendered to look like a phosphor terminal display

### Infrastructure Callouts (CRITICAL — must be prominent)
The page MUST prominently display that this runs on real hardware:
- "Running live on a Raspberry Pi 5 K3s cluster" — with animated green ping dot
- Technology tags: K3s, ARM64, Raspberry Pi 5, Longhorn Storage, COBOL, MQTT, GnuCOBOL
- Visible on the page, not hidden in footer
- "PatientZero — Australian AI & Software Consultancy" branding

### "Stack Complexity" Counter
Add a visible element showing the technology stack count:
- Count every distinct technology used: GnuCOBOL, Docker, K3s, Longhorn, Cloudflare Tunnel, MQTT, Mosquitto, Next.js, React, TypeScript, Tailwind CSS, Canvas API, nginx Ingress, ARM64 Linux, OpenSky API
- Display as: "15 technologies, 12 vendors — to show dots on a map"
- This is the punchline for the blog post about mainframe complexity

### Links
- GitHub: https://github.com/PatientZero-AU/cobol-flight-tracker
- Blog: https://paul-seymour.com/articles/human-of-the-gaps
- Company: https://paul-seymour.com

### SEO (CRITICAL)
- Server-side rendered with Next.js App Router
- Proper meta tags, OpenGraph, Twitter cards
- JSON-LD structured data
- Title: "GreenSky — Live COBOL Flight Tracker | Australian Airspace"
- Description mentioning COBOL, AI, mainframe modernisation, Raspberry Pi, K3s, MQTT
- Canonical URL: https://greensky.electricsheep.au
- Australian English throughout (colour, analyse, modernisation)

## Tech Stack
- Next.js 15 (App Router, standalone output)
- TypeScript
- Tailwind CSS 4
- mqtt.js (MQTT over WebSocket client)
- HTML5 Canvas for map rendering
- next/font for VT323 + IBM Plex Mono

## Containers

### COBOL Container (Dockerfile.cobol)
- Base: debian:bookworm-slim
- Install: gnucobol4, curl, jq, python3-paho-mqtt (or mosquitto-clients for mosquitto_pub)
- Compile flight-tracker.cob (or a new mqtt-publisher.cob / Python wrapper)
- Entrypoint: loop every 30s — fetch OpenSky API → parse → publish to MQTT
- The COBOL app does the flight data processing; a thin shell/python wrapper handles MQTT publish
- Image: `registry2.palmtech.com.au/greensky-cobol:latest`

### Next.js Container (Dockerfile)
- Multi-stage Node.js build
- Standalone output
- Image: `registry2.palmtech.com.au/greensky-web:latest`

### Both containers MUST build for linux/arm64

## K8s Deployment
- Namespace: `greensky`
- COBOL deployment: 1 replica, connects to mosquitto.barleycorn:1883
- Next.js deployment: 1 replica, port 3000
- Services: greensky-cobol (ClusterIP), greensky-web (ClusterIP)
- Ingress: `greensky.electricsheep.au`
  - `/` → greensky-web:3000
  - `/mqtt/` → mosquitto.barleycorn:9001 (WebSocket upgrade)
  - ingressClassName: cloudflare-tunnel
  - annotation: cloudflare-tunnel-ingress-controller.strrl.dev/backend-protocol: http

## Colour Palette
- Phosphor green: #33ff33
- Phosphor dim: #1a8c1a
- Phosphor glow: #00ff4480
- Bezel grey: #2a2a2a
- Background: #0a0a0a
- Amber accent: #ffb000

## File Structure
```
greensky/
├── src/app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── CrtMonitor.tsx       # Bezel + screen frame
│   ├── FlightCanvas.tsx     # Canvas map renderer (client component)
│   ├── InfraBanner.tsx      # K3s/Pi cluster info strip
│   └── StackCounter.tsx     # "15 technologies" punchline
├── src/lib/
│   ├── mqtt-client.ts       # MQTT over WebSocket connection
│   ├── australia-coastline.ts  # Lat/lon coordinates for outline
│   ├── airports.ts          # Major airport positions
│   └── projection.ts        # GPS → canvas coordinate transform
├── cobol/
│   ├── mqtt-publisher.py    # Python wrapper: fetch OpenSky → publish MQTT
│   └── Dockerfile           # COBOL container
├── Dockerfile               # Next.js container
├── k8s/
│   ├── namespace.yaml
│   ├── cobol-deployment.yaml
│   ├── nextjs-deployment.yaml
│   ├── services.yaml
│   └── ingress.yaml
├── next.config.ts
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

## OpenSky API
- Endpoint: `https://opensky-network.org/api/states/all?lamin=-44&lamax=-10&lomin=112&lomax=154`
- Returns all aircraft in Australian bounding box
- Rate limit: ~400 req/day anonymous, more with account
- Credentials via env vars: OPENSKY_USERNAME, OPENSKY_PASSWORD
- Fields: icao24, callsign, origin_country, longitude, latitude, baro_altitude, velocity, true_track, on_ground

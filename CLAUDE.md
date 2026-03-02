# CLAUDE.md — GreenSky

## What This Is
A Next.js web application that wraps a live COBOL flight tracker terminal in a retro CRT monitor aesthetic. The COBOL app runs in a separate container on a Raspberry Pi K3s cluster.

## Immutable Rules

### Docker-Only Builds
All dev/build work MUST use Docker. Never run native builds on the host.

### K8s Ingress — ALWAYS Use Cloudflare Tunnel
All public-facing services MUST use `ingressClassName: cloudflare-tunnel`.
Required annotation: `cloudflare-tunnel-ingress-controller.strrl.dev/backend-protocol: http`

## Architecture
- **COBOL container**: Runs the flight tracker binary + ttyd (web terminal server) on port 7681
- **Next.js container**: Serves the CRT wrapper page on port 3000
- **K8s**: Both containers in `greensky` namespace, Cloudflare tunnel ingress at `greensky.electricsheep.au`
- **WebSocket proxy**: Next.js rewrites `/terminal/` to the COBOL service ttyd endpoint

## Design Requirements

### The Page
Single-page Next.js app with:
- **CRT monitor frame**: Chunky plastic bezel, scanlines, phosphor glow, vignette, barrel distortion
- **xterm.js terminal**: Connects via WebSocket to ttyd, renders inside the CRT frame
- **Green phosphor aesthetic**: Classic green-on-black terminal look
- **PatientZero™ badge**: Bottom-left of bezel
- **Power LED**: Green, pulsing, bottom-right of bezel
- **Loading state**: "INITIALISING COBOL RUNTIME..." with blinking cursor, fades when terminal connects

### Infrastructure callouts (IMPORTANT — make these visible)
The page MUST make it clear this runs on real hardware:
- "Running live on a Raspberry Pi 5 K3s cluster" — visible on the page
- Show cluster info: "K3s • ARM64 • Raspberry Pi 5 • Longhorn Storage"
- Link to GitHub repo
- Link to the blog post (https://paul-seymour.com/articles/human-of-the-gaps)
- Subtle "PatientZero — Australian AI & Software Consultancy" branding

### SEO (CRITICAL)
- Server-side rendered with Next.js App Router
- Proper meta tags, OpenGraph, Twitter cards
- Structured data (JSON-LD)
- Title: "GreenSky — Live COBOL Flight Tracker | Australian Airspace"
- Description mentioning COBOL, AI, mainframe modernisation, Raspberry Pi, K3s
- Fast — minimal JS, lazy load xterm.js
- Canonical URL: https://greensky.electricsheep.au

### Fonts
- VT323 for terminal/retro text
- IBM Plex Mono for body/UI text
- Load via next/font or Google Fonts with display: swap

### Australian English
All copy uses Australian English (colour, analyse, modernisation, etc.)

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- xterm.js + xterm-addon-fit + xterm-addon-web-links
- next/font for font loading

## File Structure
```
greensky/
├── src/
│   └── app/
│       ├── layout.tsx          # Root layout with metadata
│       ├── page.tsx            # Main CRT page
│       └── globals.css         # CRT effects, scanlines, bezel styles
├── public/
│   └── og-image.png           # OpenGraph preview image
├── Dockerfile                  # Multi-stage Next.js build
├── k8s/
│   ├── namespace.yaml
│   ├── cobol-deployment.yaml   # COBOL + ttyd container
│   ├── nextjs-deployment.yaml  # Next.js container
│   ├── services.yaml
│   └── ingress.yaml            # Cloudflare tunnel
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

## Colour Palette
- Phosphor green: #33ff33
- Phosphor dim: #1a8c1a  
- Phosphor glow: #00ff4480
- Bezel grey: #2a2a2a
- Background: #0a0a0a
- Accent amber: #ffb000 (for warnings/highlights)

## K8s Deployment Notes
- Namespace: `greensky`
- COBOL image: `registry2.palmtech.com.au/greensky-cobol:latest`
- Next.js image: `registry2.palmtech.com.au/greensky-web:latest`
- COBOL service: `greensky-cobol` port 7681
- Next.js service: `greensky-web` port 3000
- Ingress: `greensky.electricsheep.au` → greensky-web:3000
- Next.js rewrites `/terminal/` → `http://greensky-cobol:7681/`

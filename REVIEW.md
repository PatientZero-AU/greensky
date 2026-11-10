# GreenSky Codebase Review — March 2026

| Dimension          | Score | Summary |
|--------------------|:-----:|---------|
| Code Clarity       | 7/10  | Clean component hierarchy, good naming. Inline readability issues in canvas code. |
| Duplication        | 6/10  | CSS variables help, but colours, DPR logic, and tech lists are duplicated across files. |
| Security           | 7/10  | Non-root containers, no hardcoded secrets. COBOL build masks failures silently. |
| Documentation      | 5/10  | Excellent CLAUDE.md but no README.md at all — critical for a public GitHub repo. |
| Tech Currency      | 7/10  | Next.js 15, React 19, Tailwind 4, TS 5.7 — all current. No tests, no linter config. |
| Architecture       | 7/10  | Smart presence-based MQTT, clean pipeline. COBOL binary compiled but never invoked. |
| **Overall**        | **6.5/10** | Solid MVP. Key gaps: dead COBOL code, MQTT reconnect churn, no README, no tests. |

---

## 1. Code Clarity — 7/10

### Good
- Clean component tree: `page.tsx` → `CrtMonitor` > `FlightCanvas`, plus `InfraBanner` and `StackCounter`
- TypeScript interfaces (`FlightData`, `FlightMessage`, `Airport`) define contracts clearly
- `projection.ts` has well-commented Mercator math with named constants
- `australia-coastline.ts` has inline region comments and source attribution
- Python publisher has a clear docstring explaining smart-mode/presence/retain behaviour
- CSS is organised into labelled sections (`/* ---- CRT Monitor ---- */`)

### Improvements

| File | Issue | Suggestion |
|------|-------|------------|
| `src/app/FlightCanvas.tsx:156` | Long ternary chain for airline name mapping | Extract to a `const AIRLINE_NAMES: Record<string, string>` lookup |
| `src/app/FlightCanvas.tsx:326` | 200-char timestamp formatting on one line | Extract to a helper `formatTimestamp(iso: string): string` |
| `src/app/FlightCanvas.tsx:12` | `TRAIL_LENGTH = 5` defined but never used | Remove dead constant |
| `src/app/FlightCanvas.tsx:291-334` | `drawHUD` takes 6 loose params | Use a `HUDState` interface |
| `cobol/flight-tracker.cob` | Entire program is a passthrough (ACCEPT → DISPLAY) | Document clearly that this is a placeholder, or implement actual validation |

---

## 2. Duplication — 6/10

### Good
- CSS custom properties (`--phosphor-green`, etc.) centralise the palette in one place
- Projection logic lives in a single `projection.ts` module
- MQTT connection abstracted into `mqtt-client.ts`

### Improvements

| Location | Duplication | Fix |
|----------|-------------|-----|
| `src/app/FlightCanvas.tsx:44,116,177,209,299` | `window.devicePixelRatio \|\| 1` repeated 5 times | Extract a `getDpr()` helper or compute once per frame |
| `src/app/FlightCanvas.tsx:9-11` + `src/app/globals.css:8-10` | Phosphor colour hex values defined in both TS constants and CSS variables | Use CSS variables exclusively via `getComputedStyle`, or accept the duplication with a comment linking them |
| `src/app/globals.css:422` | `font-family: "VT323", monospace` hardcoded alongside CSS variable approach used elsewhere | Use `var(--font-vt323)` consistently |
| `src/app/globals.css:44,222,308` | `max-width: 1100px` on three selectors | Extract a shared `.max-container` class or CSS variable |
| `src/app/InfraBanner.tsx:3-11` + `src/app/StackCounter.tsx:3-22` | Two overlapping but different technology lists | Single source of truth: shared `TECH_STACK` constant in `src/lib/tech-stack.ts`, with subsets for each component |
| `src/lib/mqtt-client.ts:19-20` + `cobol/mqtt-publisher.py:24-25` | MQTT topic strings duplicated across languages | Acceptable cross-language duplication — add a comment cross-referencing |

---

## 3. Security — 7/10

### Good
- Next.js Dockerfile runs as non-root user (`nextjs:1001`)
- `rel="noopener noreferrer"` on all external links
- No secrets in source — MQTT broker address via env vars
- `dangerouslySetInnerHTML` used only for `JSON.stringify` of controlled data (safe)
- `--no-install-recommends` minimises COBOL container attack surface
- MQTT QoS 0 is appropriate — flight positions are ephemeral, non-sensitive

### Improvements

| File | Issue | Severity | Fix |
|------|-------|----------|-----|
| `cobol/Dockerfile:22` | `\|\| echo "COBOL compile warning (non-fatal)"` masks build failures — a broken or missing binary gets deployed silently | **High** | Remove the `\|\| echo` fallback. Let the build fail loudly. |
| `cobol/Dockerfile:15` | `pip3 install --break-system-packages` bypasses Python venv isolation | Medium | Use a Python venv: `RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install paho-mqtt` |
| `cobol/Dockerfile:1` | `debian:bookworm-slim` not pinned to digest | Low | Pin to a SHA digest for reproducible builds, or accept the risk for a personal project |
| `Dockerfile:1` | `node:22-alpine` not pinned to digest | Low | Same as above |
| `cobol/mqtt-publisher.py:52` | `subprocess.run(["curl", ...])` — works fine (no injection, args not user-controlled) but adds curl as a dependency | Low | Use Python `urllib.request` to eliminate the `curl` dependency |
| `k8s/cobol-deployment.yaml` | No readiness/liveness probes on the COBOL pod | Medium | Add an exec probe (e.g., check if the Python process is running) |
| `k8s/` | No NetworkPolicy manifests | Low | Add a NetworkPolicy restricting the greensky namespace to only talk to mosquitto in barleycorn |

---

## 4. Documentation — 5/10

### Good
- `CLAUDE.md` is outstanding — architecture, message formats, design requirements, colour palette, file structure, deployment topology
- Coastline data has WGS84 source attribution and simplification methodology
- Python publisher docstring explains smart mode, presence pings, retained messages
- SEO metadata is thorough: JSON-LD, OpenGraph, Twitter cards, canonical URL, keywords

### Improvements

| Issue | Priority | Action |
|-------|----------|--------|
| **No README.md** — the GitHub repo (`PatientZero-AU/cobol-flight-tracker`) has no public-facing docs | **Critical** | Create `README.md` with: project overview, architecture diagram, local dev setup (Docker), deployment steps, screenshots, links |
| No inline docs on projection math | Medium | Add a brief comment to `mercatorY()` explaining the formula |
| No JSDoc on exported functions | Low | Add JSDoc to `createMqttClient`, `projectToCanvas`, `isInBounds` |
| COBOL passthrough not documented outside source | Medium | Note in README that the COBOL program is a placeholder for future validation logic |
| No CONTRIBUTING.md | Low | Add basic contribution guidelines if the repo will accept PRs |
| nginx sidecar pattern not explained | Medium | Add a comment in `k8s/nextjs-deployment.yaml` explaining why nginx is needed (WebSocket upgrade for MQTT) |

---

## 5. Tech Currency (March 2026) — 7/10

### Good
- **Next.js 15.2** — current stable (App Router, standalone output)
- **React 19** — current major
- **Tailwind CSS 4** with `@tailwindcss/postcss` — current
- **TypeScript 5.7** — current
- **Node.js 22 Alpine** — current LTS
- **mqtt.js 5.10** — current
- **paho-mqtt** (Python) — standard MQTT library
- **Kubernetes Ingress API v1** — current stable

### Improvements

| Issue | Priority | Action |
|-------|----------|--------|
| No test framework at all | **High** | Add Vitest (aligns with Vite/Next.js ecosystem). At minimum: unit tests for `projection.ts`, `process_flights()` |
| `next lint` in scripts but no `.eslintrc` | High | Run `npx next lint` to generate config, or add `eslint.config.mjs` for flat config (ESLint 9) |
| No formatter config (Prettier/Biome) | Medium | Add `.prettierrc` or switch to Biome for lint + format in one tool |
| No `engines` field in `package.json` | Low | Add `"engines": { "node": ">=22" }` to match the Dockerfile |
| No CI/CD pipeline | Medium | Add GitHub Actions: lint, type-check, build, Docker build |
| No `.nvmrc` or `.node-version` | Low | Add `.nvmrc` with `22` for contributor consistency |

---

## 6. Architecture — 7/10

### Good
- **Smart presence-based data fetching**: publisher only calls the API when viewers are connected, with immediate fetch on first viewer — excellent resource efficiency
- **Retained MQTT messages**: new subscribers get instant data without waiting for next poll cycle
- **nginx sidecar**: necessary pattern for WebSocket upgrade to Mosquitto — cleanly handled via ConfigMap
- **Standalone Next.js output**: minimal production container with no dev dependencies
- **Proper Mercator projection**: aspect-ratio-preserving projection with padding — mathematically correct
- **ExternalName service**: clean cross-namespace access to Mosquitto broker
- **Client-side canvas rendering**: appropriate for 60fps real-time flight visualisation

### Improvements

| File | Issue | Impact | Fix |
|------|-------|--------|-----|
| `cobol/mqtt-publisher.py` | The compiled COBOL binary is **never invoked**. `COBOL_BINARY` env var is set in Dockerfile but mqtt-publisher.py doesn't reference it. The entire COBOL compilation is dead code. | **High** | Either pipe data through the COBOL binary (`subprocess.run([COBOL_BINARY], input=json_data)`) or remove the pretence. Currently the "COBOL-powered" claim is technically false for the data pipeline. |
| `src/app/FlightCanvas.tsx:63-66,132-137` | `handleMessage` depends on `airlineFilter` → changes every filter click → `useEffect` for MQTT recreates the client connection. **Every airline filter click disconnects and reconnects MQTT.** | **High** | Use a ref for the message handler: `const handleMessageRef = useRef(handleMessage); handleMessageRef.current = handleMessage;` and pass a stable callback to `createMqttClient`. |
| `k8s/services.yaml:17-31` | `greensky-cobol` Service exposes port 80, but the COBOL container doesn't listen on any port. It's a pure MQTT publisher, not an HTTP server. Dead K8s resource. | Medium | Remove the `greensky-cobol` Service — it serves no purpose. |
| `src/app/FlightCanvas.tsx` | 334 lines — mixes React lifecycle, canvas drawing, and HUD rendering | Medium | Extract drawing functions into `src/lib/canvas-renderer.ts` — keeps FlightCanvas.tsx focused on React concerns |
| `src/app/FlightCanvas.tsx:326` | Timestamp uses browser local time but display context is ambiguous | Low | Either label it explicitly ("LOCAL") or use UTC consistently to match aviation conventions |
| `src/app/FlightCanvas.tsx` | No React error boundary wrapping the canvas | Low | Add an error boundary so a canvas/MQTT failure doesn't blank the entire page |
| `cobol/Dockerfile:26` | `FETCH_INTERVAL=30` in Dockerfile but `mqtt-publisher.py` defaults to 120 — the Dockerfile value takes priority but the mismatch is confusing | Low | Align defaults or remove one |

---

## Priority Action Plan

### P0 — Fix Now (bugs / correctness)
1. **Fix MQTT reconnect on filter change** (`FlightCanvas.tsx`) — use a ref-based stable callback
2. **Remove silent COBOL build failure masking** (`cobol/Dockerfile:22`) — let builds fail loudly
3. **Wire up or remove COBOL binary** — either use it in the pipeline or drop the compilation step

### P1 — Before Public Launch
4. **Create README.md** — project overview, architecture, screenshots, local dev, deployment
5. **Add Vitest** with tests for `projection.ts` and `process_flights()` at minimum
6. **Add ESLint config** — `next lint` is a script but there's no config to use
7. **Remove dead `greensky-cobol` Service** from `k8s/services.yaml`
8. **Add health probes** to COBOL deployment

### P2 — Polish
9. Extract drawing functions from `FlightCanvas.tsx` into `src/lib/canvas-renderer.ts`
10. Unify technology lists into `src/lib/tech-stack.ts`
11. Extract DPR helper to eliminate 5x duplication
12. Add airline name lookup map to replace ternary chain
13. Remove unused `TRAIL_LENGTH` constant
14. Add CI/CD pipeline (GitHub Actions: lint, type-check, build, Docker)
15. Add `engines` field and `.nvmrc`

### P3 — Nice to Have
16. Python venv in COBOL Dockerfile instead of `--break-system-packages`
17. Pin Docker base images to SHA digests
18. Replace `curl` subprocess with Python `urllib`
19. Add NetworkPolicy for namespace isolation
20. Add Prettier/Biome config for formatting

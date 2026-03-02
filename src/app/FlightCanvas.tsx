"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { projectToCanvas } from "@/lib/projection";
import { AIRPORTS } from "@/lib/airports";
import { MAINLAND_COAST, TASMANIA_COAST } from "@/lib/australia-coastline";
import { createMqttClient, FlightData, FlightMessage } from "@/lib/mqtt-client";

const PHOSPHOR_GREEN = "#33ff33";
const PHOSPHOR_DIM = "#1a8c1a";
const PHOSPHOR_BRIGHT = "#66ff66";
const TRAIL_LENGTH = 5;

interface FlightTrail {
  positions: { x: number; y: number }[];
  callsign: string;
  heading: number;
  altitude: number;
  velocity: number;
  on_ground: boolean;
}

export default function FlightCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flightsRef = useRef<Map<string, FlightTrail>>(new Map());
  const [flightCount, setFlightCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [mqttStatus, setMqttStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const animFrameRef = useRef<number>(0);
  const [airlineFilter, setAirlineFilter] = useState<string>("ALL");
  const allFlightsRef = useRef<FlightMessage | null>(null);

  const applyFilter = useCallback((data: FlightMessage, filter: string) => {
    const trails = flightsRef.current;
    const filtered = filter === "ALL" ? data.flights : data.flights.filter((f: FlightData) => {
      const prefix = f.callsign.trim().substring(0, 3).toUpperCase();
      if (filter === "VAU") return prefix === "VAU" || prefix === "VOZ";
      return prefix === filter;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;

    trails.clear();
    filtered.forEach((flight: FlightData) => {
      const pos = projectToCanvas(flight.lat, flight.lon, canvas.width / dpr, canvas.height / dpr);
      trails.set(flight.callsign, {
        positions: [pos],
        callsign: flight.callsign,
        heading: flight.heading,
        altitude: flight.altitude,
        velocity: flight.velocity,
        on_ground: flight.on_ground,
      });
    });

    setFlightCount(filtered.length);
    setLastUpdate(data.timestamp);
  }, []);

  const handleMessage = useCallback((data: FlightMessage) => {
    allFlightsRef.current = data;
    applyFilter(data, airlineFilter);
  }, [airlineFilter, applyFilter]);

  // Re-apply filter when it changes
  useEffect(() => {
    if (allFlightsRef.current) {
      applyFilter(allFlightsRef.current, airlineFilter);
    }
  }, [airlineFilter, applyFilter]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    // Draw coastline
    drawCoastline(ctx, MAINLAND_COAST, w, h);
    drawCoastline(ctx, TASMANIA_COAST, w, h);

    // Draw airports
    drawAirports(ctx, w, h);

    // Draw flights
    const trails = flightsRef.current;
    trails.forEach((trail) => {
      drawFlightTrail(ctx, trail);
      drawFlightDot(ctx, trail);
    });

    // Draw HUD overlay
    drawHUD(ctx, w, h, trails.size, lastUpdate, mqttStatus);

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [lastUpdate, mqttStatus]);

  // Resize canvas to fill container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // MQTT connection
  useEffect(() => {
    const client = createMqttClient(handleMessage, setMqttStatus);
    return () => {
      client.end();
    };
  }, [handleMessage]);

  // Animation loop
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawFrame]);

  return (
    <div ref={containerRef} className="crt-canvas-container">
      <canvas ref={canvasRef} className="crt-canvas" />
      {/* Airline filter radio buttons */}
      <div className="airline-filter">
        {["ALL", "QFA", "VAU", "JST", "QJE"].map((code) => (
          <button
            key={code}
            className={`filter-btn ${airlineFilter === code ? "active" : ""}`}
            onClick={() => setAirlineFilter(code)}
          >
            {code === "ALL" ? "ALL" : code === "QFA" ? "QANTAS" : code === "VAU" ? "VIRGIN" : code === "JST" ? "JETSTAR" : "QANTASLINK"}
          </button>
        ))}
      </div>
      {/* Flight count overlay for screen readers / SEO */}
      <div className="sr-only" aria-live="polite">
        {flightCount} flights tracked. Last updated {lastUpdate ?? "awaiting data"}.
      </div>
    </div>
  );
}

function drawCoastline(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  w: number,
  h: number
) {
  if (points.length < 2) return;

  // Use logical size (before DPR scaling)
  const dpr = window.devicePixelRatio || 1;
  const lw = w / dpr;
  const lh = h / dpr;

  ctx.strokeStyle = PHOSPHOR_DIM;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = PHOSPHOR_GREEN;
  ctx.shadowBlur = 3;
  ctx.beginPath();

  const start = projectToCanvas(points[0][0], points[0][1], lw, lh);
  ctx.moveTo(start.x, start.y);

  for (let i = 1; i < points.length; i++) {
    const p = projectToCanvas(points[i][0], points[i][1], lw, lh);
    ctx.lineTo(p.x, p.y);
  }

  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw dots at each coordinate for phosphor effect
  ctx.fillStyle = PHOSPHOR_DIM;
  for (const point of points) {
    const p = projectToCanvas(point[0], point[1], lw, lh);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAirports(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  const lw = w / dpr;
  const lh = h / dpr;

  ctx.font = "11px 'VT323', monospace";
  ctx.textAlign = "center";

  AIRPORTS.forEach((airport) => {
    const p = projectToCanvas(airport.lat, airport.lon, lw, lh);

    // Crosshair marker
    ctx.strokeStyle = PHOSPHOR_DIM;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 4, p.y);
    ctx.lineTo(p.x + 4, p.y);
    ctx.moveTo(p.x, p.y - 4);
    ctx.lineTo(p.x, p.y + 4);
    ctx.stroke();

    // Label
    ctx.fillStyle = PHOSPHOR_DIM;
    ctx.shadowColor = PHOSPHOR_GREEN;
    ctx.shadowBlur = 2;
    ctx.fillText(airport.code, p.x, p.y - 8);
    ctx.shadowBlur = 0;
  });
}

function drawFlightTrail(ctx: CanvasRenderingContext2D, trail: FlightTrail) {
  if (trail.positions.length < 2) return;

  for (let i = 1; i < trail.positions.length; i++) {
    const alpha = (i / trail.positions.length) * 0.6;
    ctx.strokeStyle = `rgba(51, 255, 51, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(trail.positions[i - 1].x, trail.positions[i - 1].y);
    ctx.lineTo(trail.positions[i].x, trail.positions[i].y);
    ctx.stroke();
  }
}

function drawFlightDot(ctx: CanvasRenderingContext2D, trail: FlightTrail) {
  const pos = trail.positions[trail.positions.length - 1];
  if (!pos) return;

  // Bright dot
  ctx.fillStyle = PHOSPHOR_BRIGHT;
  ctx.shadowColor = PHOSPHOR_GREEN;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Heading indicator line
  const rad = (trail.heading - 90) * (Math.PI / 180);
  ctx.strokeStyle = PHOSPHOR_GREEN;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x + Math.cos(rad) * 10, pos.y + Math.sin(rad) * 10);
  ctx.stroke();

  // Callsign label
  ctx.font = "10px 'VT323', monospace";
  ctx.fillStyle = PHOSPHOR_GREEN;
  ctx.textAlign = "left";
  ctx.shadowColor = PHOSPHOR_GREEN;
  ctx.shadowBlur = 4;
  ctx.fillText(trail.callsign.trim(), pos.x + 6, pos.y - 4);

  // Altitude label (FL = flight level in hundreds of feet)
  if (!trail.on_ground && trail.altitude > 0) {
    ctx.font = "9px 'VT323', monospace";
    ctx.fillStyle = PHOSPHOR_DIM;
    ctx.fillText(`FL${Math.round(trail.altitude / 100)}`, pos.x + 6, pos.y + 8);
  }
  ctx.shadowBlur = 0;
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  timestamp: string | null,
  status: string
) {
  const dpr = window.devicePixelRatio || 1;
  const lw = w / dpr;
  const lh = h / dpr;

  ctx.font = "14px 'VT323', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = PHOSPHOR_GREEN;
  ctx.shadowColor = PHOSPHOR_GREEN;
  ctx.shadowBlur = 4;

  // Top-left: title
  ctx.fillText("GREENSKY — AUSTRALIAN AIRSPACE", 12, 20);

  // Top-right: MQTT status
  ctx.textAlign = "right";
  const statusLabel = status === "connected" ? "▪ MQTT LIVE" : status === "error" ? "▪ MQTT ERROR" : "▪ MQTT OFFLINE";
  ctx.fillStyle = status === "connected" ? PHOSPHOR_GREEN : "#ff3333";
  ctx.fillText(statusLabel, lw - 12, 20);

  // Bottom-left: flight count
  ctx.textAlign = "left";
  ctx.fillStyle = PHOSPHOR_GREEN;
  ctx.fillText(`TRACKING: ${count} AIRCRAFT`, 12, lh - 12);

  // Bottom-right: timestamp
  ctx.textAlign = "right";
  if (timestamp) {
    const ts = new Date(timestamp).toISOString().replace("T", " ").substring(0, 19) + " UTC";
    ctx.fillText(ts, lw - 12, lh - 12);
  } else {
    ctx.fillStyle = PHOSPHOR_DIM;
    ctx.fillText("AWAITING DATA...", lw - 12, lh - 12);
  }

  ctx.shadowBlur = 0;
}

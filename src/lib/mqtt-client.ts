import mqtt, { MqttClient } from "mqtt";

export interface FlightData {
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  heading: number;
  origin: string;
  on_ground: boolean;
}

export interface FlightMessage {
  timestamp: string;
  flights: FlightData[];
}

const TOPIC = "greensky/flights";
const PRESENCE_TOPIC = "greensky/viewers";
const PRESENCE_INTERVAL = 30000; // ping every 30s

export function createMqttClient(
  onMessage: (data: FlightMessage) => void,
  onStatus: (status: "connected" | "disconnected" | "error") => void
): MqttClient {
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
  const url = `${protocol}://${host}/mqtt/`;

  const client = mqtt.connect(url, {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    keepalive: 30,
  });

  let presenceTimer: ReturnType<typeof setInterval> | null = null;

  const sendPresence = () => {
    if (client.connected) {
      client.publish(PRESENCE_TOPIC, JSON.stringify({ action: "viewing", count: 1 }), { qos: 0 });
    }
  };

  client.on("connect", () => {
    onStatus("connected");
    client.subscribe(TOPIC, { qos: 0 });

    // Signal to publisher that someone is watching
    sendPresence();
    presenceTimer = setInterval(sendPresence, PRESENCE_INTERVAL);
  });

  client.on("message", (topic: string, payload: Buffer) => {
    if (topic !== TOPIC) return; // ignore presence echo
    try {
      const data = JSON.parse(payload.toString()) as FlightMessage;
      onMessage(data);
    } catch {
      // Malformed message — skip
    }
  });

  client.on("error", () => {
    onStatus("error");
  });

  client.on("close", () => {
    onStatus("disconnected");
    if (presenceTimer) {
      clearInterval(presenceTimer);
      presenceTimer = null;
    }
  });

  return client;
}

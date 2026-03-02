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

export function createMqttClient(
  onMessage: (data: FlightMessage) => void,
  onStatus: (status: "connected" | "disconnected" | "error") => void
): MqttClient {
  // Connect via WebSocket through the ingress /mqtt/ path
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
  const url = `${protocol}://${host}/mqtt/`;

  const client = mqtt.connect(url, {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    keepalive: 30,
  });

  client.on("connect", () => {
    onStatus("connected");
    client.subscribe(TOPIC, { qos: 0 });
  });

  client.on("message", (_topic: string, payload: Buffer) => {
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
  });

  return client;
}

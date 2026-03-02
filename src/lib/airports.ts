export interface Airport {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: Airport[] = [
  { code: "SYD", name: "Sydney", lat: -33.946, lon: 151.177 },
  { code: "MEL", name: "Melbourne", lat: -37.673, lon: 144.843 },
  { code: "BNE", name: "Brisbane", lat: -27.384, lon: 153.117 },
  { code: "PER", name: "Perth", lat: -31.940, lon: 115.967 },
  { code: "ADL", name: "Adelaide", lat: -34.945, lon: 138.531 },
  { code: "CBR", name: "Canberra", lat: -35.307, lon: 149.195 },
  { code: "HBA", name: "Hobart", lat: -42.836, lon: 147.510 },
  { code: "DRW", name: "Darwin", lat: -12.415, lon: 130.877 },
];

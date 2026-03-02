// GPS coordinate → canvas pixel projection for Australia
// Mercator projection with correct aspect ratio

const AU_BOUNDS = {
  latMin: -44.0, // South (Tasmania)
  latMax: -10.0, // North (Cape York)
  lonMin: 112.0, // West (WA coast)
  lonMax: 154.0, // East (QLD coast)
};

const PADDING = 0.05;

function mercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

const Y_MIN = mercatorY(AU_BOUNDS.latMin);
const Y_MAX = mercatorY(AU_BOUNDS.latMax);
const LON_RANGE = AU_BOUNDS.lonMax - AU_BOUNDS.lonMin;
const MERC_Y_RANGE = Y_MAX - Y_MIN;

// Aspect ratio: how wide the map should be relative to its height
const MAP_ASPECT = (LON_RANGE * Math.PI / 180) / MERC_Y_RANGE;

export function projectToCanvas(
  lat: number,
  lon: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const padX = canvasWidth * PADDING;
  const padY = canvasHeight * PADDING;
  const availW = canvasWidth - 2 * padX;
  const availH = canvasHeight - 2 * padY;

  // Fit map within available space preserving aspect ratio
  let drawW: number, drawH: number;
  if (availW / availH > MAP_ASPECT) {
    // Canvas is wider than map — constrain by height
    drawH = availH;
    drawW = drawH * MAP_ASPECT;
  } else {
    // Canvas is taller than map — constrain by width
    drawW = availW;
    drawH = drawW / MAP_ASPECT;
  }

  const offsetX = padX + (availW - drawW) / 2;
  const offsetY = padY + (availH - drawH) / 2;

  const normX = (lon - AU_BOUNDS.lonMin) / LON_RANGE;
  const normY = (Y_MAX - mercatorY(lat)) / MERC_Y_RANGE;

  return {
    x: offsetX + normX * drawW,
    y: offsetY + normY * drawH,
  };
}

export function isInBounds(lat: number, lon: number): boolean {
  return (
    lat >= AU_BOUNDS.latMin &&
    lat <= AU_BOUNDS.latMax &&
    lon >= AU_BOUNDS.lonMin &&
    lon <= AU_BOUNDS.lonMax
  );
}

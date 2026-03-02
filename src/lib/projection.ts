// GPS coordinate → canvas pixel projection for Australia
// Uses simple Mercator projection bounded to Australian region

const AU_BOUNDS = {
  latMin: -44.0, // South (Tasmania)
  latMax: -10.0, // North (Cape York)
  lonMin: 112.0, // West (WA coast)
  lonMax: 154.0, // East (QLD coast)
};

const PADDING = 0.05; // 5% padding on each side

export function projectToCanvas(
  lat: number,
  lon: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const padX = canvasWidth * PADDING;
  const padY = canvasHeight * PADDING;
  const drawWidth = canvasWidth - 2 * padX;
  const drawHeight = canvasHeight - 2 * padY;

  const x =
    padX +
    ((lon - AU_BOUNDS.lonMin) / (AU_BOUNDS.lonMax - AU_BOUNDS.lonMin)) *
      drawWidth;

  // Invert Y axis — canvas Y increases downward, latitude increases upward
  const y =
    padY +
    ((AU_BOUNDS.latMax - lat) / (AU_BOUNDS.latMax - AU_BOUNDS.latMin)) *
      drawHeight;

  return { x, y };
}

export function isInBounds(lat: number, lon: number): boolean {
  return (
    lat >= AU_BOUNDS.latMin &&
    lat <= AU_BOUNDS.latMax &&
    lon >= AU_BOUNDS.lonMin &&
    lon <= AU_BOUNDS.lonMax
  );
}

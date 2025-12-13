import type { CoverageData } from '../types';
import { COVERAGE_COLORS } from './constants';

const TILE_SIZE = 256;
const DEFAULT_CANVAS_SIZE = 6000;

interface ExportOptions {
  coverage: CoverageData;
  tileLayerUrl: string;
  width?: number;
  height?: number;
  colorIndex?: number;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Get color for distance using same logic as CoveragePointsRenderer
 */
function getColorForDistance(
  distance: number,
  maxDistance: number,
  colorIndex: number
): string {
  const colorScheme = COVERAGE_COLORS[colorIndex % COVERAGE_COLORS.length];
  const ratio = Math.min(distance / maxDistance, 1);
  const hue = colorScheme.startHue + ratio * (colorScheme.endHue - colorScheme.startHue);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Calculate bounds from coverage data with padding
 */
function getCoverageBounds(coverage: CoverageData): Bounds {
  let north = -90, south = 90, east = -180, west = 180;

  for (const ray of coverage.rays) {
    for (const point of ray.visiblePoints) {
      north = Math.max(north, point.position.lat);
      south = Math.min(south, point.position.lat);
      east = Math.max(east, point.position.lng);
      west = Math.min(west, point.position.lng);
    }
  }

  // Also include the center point
  north = Math.max(north, coverage.center.lat);
  south = Math.min(south, coverage.center.lat);
  east = Math.max(east, coverage.center.lng);
  west = Math.min(west, coverage.center.lng);

  // Add generous padding (15%)
  const latPadding = (north - south) * 0.15;
  const lngPadding = (east - west) * 0.15;

  return {
    north: north + latPadding,
    south: south - latPadding,
    east: east + lngPadding,
    west: west - lngPadding,
  };
}

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
  return { x, y };
}

/**
 * Convert tile coordinates to lat/lng (top-left corner of tile)
 */
function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const lng = (x / Math.pow(2, zoom)) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/**
 * Calculate optimal zoom level for bounds to fit in canvas
 */
function getOptimalZoom(bounds: Bounds, canvasWidth: number, canvasHeight: number): number {
  for (let zoom = 18; zoom >= 1; zoom--) {
    const nwTile = latLngToTile(bounds.north, bounds.west, zoom);
    const seTile = latLngToTile(bounds.south, bounds.east, zoom);

    const tilesX = seTile.x - nwTile.x + 1;
    const tilesY = seTile.y - nwTile.y + 1;

    const requiredWidth = tilesX * TILE_SIZE;
    const requiredHeight = tilesY * TILE_SIZE;

    // Use higher zoom - allow up to 9x canvas size for good detail
    if (requiredWidth <= canvasWidth * 9 && requiredHeight <= canvasHeight * 9) {
      return zoom;
    }
  }
  return 4;
}

/**
 * Fetch a single tile as an image
 */
async function fetchTile(url: string, x: number, y: number, z: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Replace placeholders in URL
    const tileUrl = url
      .replace('{z}', z.toString())
      .replace('{x}', x.toString())
      .replace('{y}', y.toString())
      .replace('{s}', ['a', 'b', 'c'][Math.floor(Math.random() * 3)])
      .replace('{r}', '');

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tile: ${tileUrl}`));
    img.src = tileUrl;
  });
}

/**
 * Convert latitude to Mercator Y
 */
function latToMercatorY(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

/**
 * Convert lat/lng to canvas pixel position using Web Mercator
 */
function latLngToPixel(
  lat: number,
  lng: number,
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * canvasWidth;

  // Use Mercator projection for Y to match map tiles
  const mercY = latToMercatorY(lat);
  const mercNorth = latToMercatorY(bounds.north);
  const mercSouth = latToMercatorY(bounds.south);

  const y = ((mercNorth - mercY) / (mercNorth - mercSouth)) * canvasHeight;

  return { x, y };
}

/**
 * Draw map tiles to canvas
 */
async function drawTilesToCanvas(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds,
  zoom: number,
  tileUrl: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const MAX_TILE_CANVAS = 16000; // Browser canvas size limit

  // Reduce zoom if tile canvas would be too large
  let actualZoom = zoom;
  let nwTile = latLngToTile(bounds.north, bounds.west, actualZoom);
  let seTile = latLngToTile(bounds.south, bounds.east, actualZoom);
  let tilesX = seTile.x - nwTile.x + 1;
  let tilesY = seTile.y - nwTile.y + 1;
  let tileGridWidth = tilesX * TILE_SIZE;
  let tileGridHeight = tilesY * TILE_SIZE;

  while (actualZoom > 1 && (tileGridWidth > MAX_TILE_CANVAS || tileGridHeight > MAX_TILE_CANVAS)) {
    actualZoom--;
    nwTile = latLngToTile(bounds.north, bounds.west, actualZoom);
    seTile = latLngToTile(bounds.south, bounds.east, actualZoom);
    tilesX = seTile.x - nwTile.x + 1;
    tilesY = seTile.y - nwTile.y + 1;
    tileGridWidth = tilesX * TILE_SIZE;
    tileGridHeight = tilesY * TILE_SIZE;
  }

  // Get the actual lat/lng of the tile grid corners
  const tileNW = tileToLatLng(nwTile.x, nwTile.y, actualZoom);
  const tileSE = tileToLatLng(seTile.x + 1, seTile.y + 1, actualZoom);

  // Create offscreen canvas for tiles
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileGridWidth;
  tileCanvas.height = tileGridHeight;
  const tileCtx = tileCanvas.getContext('2d')!;

  // Fetch all tiles in parallel
  const tilePromises: Promise<{ img: HTMLImageElement; x: number; y: number }>[] = [];

  for (let y = nwTile.y; y <= seTile.y; y++) {
    for (let x = nwTile.x; x <= seTile.x; x++) {
      tilePromises.push(
        fetchTile(tileUrl, x, y, actualZoom)
          .then((img) => ({
            img,
            x: (x - nwTile.x) * TILE_SIZE,
            y: (y - nwTile.y) * TILE_SIZE,
          }))
          .catch(() => ({
            img: new Image(),
            x: (x - nwTile.x) * TILE_SIZE,
            y: (y - nwTile.y) * TILE_SIZE,
          }))
      );
    }
  }

  const tiles = await Promise.all(tilePromises);

  // Draw tiles to tile canvas
  for (const tile of tiles) {
    if (tile.img.complete && tile.img.naturalWidth > 0) {
      tileCtx.drawImage(tile.img, tile.x, tile.y, TILE_SIZE, TILE_SIZE);
    }
  }

  // Calculate the portion of tile canvas that maps to our bounds (using Mercator for Y)
  const mercTileNW = latToMercatorY(tileNW.lat);
  const mercTileSE = latToMercatorY(tileSE.lat);
  const mercBoundsNorth = latToMercatorY(bounds.north);
  const mercBoundsSouth = latToMercatorY(bounds.south);

  const boundsNWPixel = {
    x: ((bounds.west - tileNW.lng) / (tileSE.lng - tileNW.lng)) * tileGridWidth,
    y: ((mercTileNW - mercBoundsNorth) / (mercTileNW - mercTileSE)) * tileGridHeight,
  };
  const boundsSEPixel = {
    x: ((bounds.east - tileNW.lng) / (tileSE.lng - tileNW.lng)) * tileGridWidth,
    y: ((mercTileNW - mercBoundsSouth) / (mercTileNW - mercTileSE)) * tileGridHeight,
  };

  // Draw the relevant portion of tile canvas to main canvas
  ctx.drawImage(
    tileCanvas,
    boundsNWPixel.x,
    boundsNWPixel.y,
    boundsSEPixel.x - boundsNWPixel.x,
    boundsSEPixel.y - boundsNWPixel.y,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
}

/**
 * Draw coverage points on canvas
 */
function drawCoveragePoints(
  ctx: CanvasRenderingContext2D,
  coverage: CoverageData,
  bounds: Bounds,
  canvasWidth: number,
  canvasHeight: number,
  colorIndex: number
): void {
  const overallMaxDistance = Math.max(...coverage.rays.map((r) => r.maxDistance), 1);
  const pointRadius = 4; // Fixed 4px dots

  ctx.globalAlpha = 0.6;

  for (const ray of coverage.rays) {
    for (const point of ray.visiblePoints) {
      const pixel = latLngToPixel(
        point.position.lat,
        point.position.lng,
        bounds,
        canvasWidth,
        canvasHeight
      );

      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = getColorForDistance(point.distance, overallMaxDistance, colorIndex);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Draw grid square label on canvas
 */
function drawGridSquareLabel(
  ctx: CanvasRenderingContext2D,
  gridSquare: string,
  canvasWidth: number
): void {
  const fontSize = Math.max(36, canvasWidth / 80);
  const paddingX = fontSize * 0.6;
  const paddingY = fontSize * 0.4;

  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
  const textMetrics = ctx.measureText(gridSquare);
  const textWidth = textMetrics.width;

  // Draw background with equal padding
  const boxX = paddingX;
  const boxY = paddingY;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  // Draw text centered vertically
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(gridSquare, boxX + paddingX, boxY + boxHeight / 2);
}

/**
 * Draw distance legend on canvas
 */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  maxDistance: number,
  canvasWidth: number,
  canvasHeight: number,
  colorIndex: number
): void {
  const fontSize = Math.max(24, canvasWidth / 120);
  const padding = fontSize * 0.8;
  const colorBoxWidth = fontSize * 2;
  const colorBoxHeight = fontSize * 0.8;
  const lineHeight = fontSize * 1.4;
  const steps = 7;

  ctx.font = `${fontSize}px sans-serif`;

  // Calculate legend dimensions
  const legendWidth = colorBoxWidth + padding * 4 + ctx.measureText('300 km').width;
  const legendHeight = lineHeight * steps + padding * 2;

  // Position in bottom-right
  const legendX = canvasWidth - legendWidth - padding * 2;
  const legendY = canvasHeight - legendHeight - padding * 2;

  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

  // Draw legend entries
  ctx.textBaseline = 'middle';
  for (let i = 0; i < steps; i++) {
    const distance = (i / (steps - 1)) * maxDistance;
    const y = legendY + padding + i * lineHeight;

    // Color box
    ctx.fillStyle = getColorForDistance(distance, maxDistance, colorIndex);
    ctx.fillRect(legendX + padding, y, colorBoxWidth, colorBoxHeight);

    // Label - vertically centered with color box
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `${Math.round(distance)} km`,
      legendX + padding * 2 + colorBoxWidth,
      y + colorBoxHeight / 2
    );
  }
}

/**
 * Download canvas as PNG
 */
function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Export coverage map as high-quality PNG
 */
export async function exportCoverageMap(options: ExportOptions): Promise<void> {
  const {
    coverage,
    tileLayerUrl,
    width = DEFAULT_CANVAS_SIZE,
    height = DEFAULT_CANVAS_SIZE,
    colorIndex = 0,
  } = options;

  // Calculate bounds
  const bounds = getCoverageBounds(coverage);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fill with dark background as fallback
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Calculate optimal zoom
  const zoom = getOptimalZoom(bounds, width, height);

  // Draw map tiles
  await drawTilesToCanvas(ctx, bounds, zoom, tileLayerUrl, width, height);

  // Draw coverage points
  drawCoveragePoints(ctx, coverage, bounds, width, height, colorIndex);

  // Draw grid square label
  if (coverage.gridSquare) {
    drawGridSquareLabel(ctx, coverage.gridSquare, width);
  }

  // Draw legend
  const maxDistance = Math.max(...coverage.rays.map((r) => r.maxDistance), 1);
  drawLegend(ctx, maxDistance, width, height, colorIndex);

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `coverage-${coverage.gridSquare || 'map'}-${timestamp}.png`;

  // Download
  downloadCanvas(canvas, filename);
}

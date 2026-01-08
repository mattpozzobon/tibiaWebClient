import { MapMarker } from '../../../../../../types/map-marker';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';
import { worldTileTopLeftToFinal, worldTileCenterToFinal, ZoomWindow } from './coordinateTransformations';
import Position from '../../../../../../game/position';

export function drawPlayerIndicator(
  ctx: CanvasRenderingContext2D,
  playerPosition: Position,
  center: Position,
  zoomWindow: ZoomWindow,
  zoomLevel: number,
  canvasSize: number
): void {
  const { x, y } = worldTileTopLeftToFinal(playerPosition.x, playerPosition.y, center, zoomWindow, zoomLevel, canvasSize);
  const size = zoomLevel;
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);
}

export function drawMarkers(
  ctx: CanvasRenderingContext2D,
  markers: MapMarker[],
  markerImages: { [key: string]: HTMLImageElement },
  center: Position,
  zoomWindow: ZoomWindow,
  zoomLevel: number,
  canvasSize: number
): void {
  const minX = 0, minY = 0, maxX = canvasSize, maxY = canvasSize;
  const baseZoom = MINIMAP_CONFIG.ZOOM_LEVEL;
  const zoomScale = Math.max(0.5, Math.min(2.5, zoomLevel / baseZoom));
  const baseMarkerScale = 1.6 * zoomScale;
  const minMarkerScale = 0.8;
  const markerScale = Math.max(minMarkerScale, baseMarkerScale);
  const margin = 64;

  ctx.imageSmoothingEnabled = false;

  for (const m of markers) {
    const { cx, cy } = worldTileCenterToFinal(m.x, m.y, center, zoomWindow, zoomLevel, canvasSize);
    if (cx < minX - margin || cx > maxX + margin || cy < minY - margin || cy > maxY + margin) continue;
    
    const img = markerImages[m.icon];
    if (img && img.complete && img.naturalWidth > 0) {
      const w = img.naturalWidth * markerScale;
      const h = img.naturalHeight * markerScale;
      const drawX = Math.round(cx - w / 2);
      const drawY = Math.round(cy - h / 2);
      const drawW = Math.round(w);
      const drawH = Math.round(h);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      const radius = Math.max(4, Math.round(4 * markerScale));
      ctx.arc(Math.round(cx), Math.round(cy), radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

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
  // Use larger scale to make markers more visible at all zoom levels
  const markerScale = 1.5;
  const margin = 64;

  // Disable image smoothing for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;
  // Use low quality smoothing if available (for better pixel art rendering)
  if ('imageSmoothingQuality' in ctx) {
    (ctx as any).imageSmoothingQuality = 'low';
  }

  // Create a temporary canvas for high-quality scaling (reused for all markers)
  let tempCanvas: HTMLCanvasElement | null = null;
  let tempCtx: CanvasRenderingContext2D | null = null;

  for (const m of markers) {
    const { cx, cy } = worldTileCenterToFinal(m.x, m.y, center, zoomWindow, zoomLevel, canvasSize);
    if (cx < minX - margin || cx > maxX + margin || cy < minY - margin || cy > maxY + margin) continue;
    
    const img = markerImages[m.icon];
    if (img && img.complete && img.naturalWidth > 0) {
      // Calculate dimensions
      const w = Math.round(img.naturalWidth * markerScale);
      const h = Math.round(img.naturalHeight * markerScale);
      const drawX = Math.round(cx - w / 2);
      const drawY = Math.round(cy - h / 2);
      
      // For pixel-perfect scaling, render to intermediate canvas first
      if (!tempCanvas || tempCanvas.width < w || tempCanvas.height < h) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.max(w, 64);
        tempCanvas.height = Math.max(h, 64);
        tempCtx = tempCanvas.getContext('2d', { willReadFrequently: false });
        if (tempCtx) {
          tempCtx.imageSmoothingEnabled = false;
          if ('imageSmoothingQuality' in tempCtx) {
            (tempCtx as any).imageSmoothingQuality = 'low';
          }
        }
      }
      
      if (tempCtx && tempCanvas) {
        // Clear and draw to temp canvas at exact scale
        tempCtx.clearRect(0, 0, w, h);
        tempCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, w, h);
        // Draw temp canvas to final canvas (this preserves quality better)
        ctx.drawImage(tempCanvas, 0, 0, w, h, drawX, drawY, w, h);
      } else {
        // Fallback to direct drawing
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, drawX, drawY, w, h);
      }
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

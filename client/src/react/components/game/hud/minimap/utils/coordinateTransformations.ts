import Position from '../../../../../../game/position';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';

export interface ZoomWindow {
  sourceSize: number;
  sourceOffset: number;
}

export function computeZoomWindow(zoomLevel: number, canvasSize: number): ZoomWindow {
  const sourceSize = canvasSize / zoomLevel;
  const sourceOffset = (canvasSize - sourceSize) / 2;
  return { sourceSize, sourceOffset };
}

export function worldTileTopLeftToFinal(
  wx: number,
  wy: number,
  center: Position,
  zoomWindow: ZoomWindow,
  zoomLevel: number,
  canvasSize: number
): { x: number; y: number } {
  const centerPoint = canvasSize / 2;
  const minimapX = wx - center.x + centerPoint;
  const minimapY = wy - center.y + centerPoint;
  const finalX = (minimapX - zoomWindow.sourceOffset) * zoomLevel;
  const finalY = (minimapY - zoomWindow.sourceOffset) * zoomLevel;
  return { x: finalX, y: finalY };
}

export function worldTileCenterToFinal(
  wx: number,
  wy: number,
  center: Position,
  zoomWindow: ZoomWindow,
  zoomLevel: number,
  canvasSize: number
): { cx: number; cy: number } {
  const tl = worldTileTopLeftToFinal(wx, wy, center, zoomWindow, zoomLevel, canvasSize);
  return { cx: tl.x + zoomLevel / 2, cy: tl.y + zoomLevel / 2 };
}

export function finalCanvasToWorld(
  fx: number,
  fy: number,
  center: Position,
  zoomWindow: ZoomWindow,
  zoomLevel: number,
  canvasSize: number
): { worldX: number; worldY: number } {
  const centerPoint = canvasSize / 2;
  const minimapX = (fx / zoomLevel) + zoomWindow.sourceOffset;
  const minimapY = (fy / zoomLevel) + zoomWindow.sourceOffset;
  return { worldX: minimapX - centerPoint + center.x, worldY: minimapY - centerPoint + center.y };
}

export function finalCanvasToTile(
  fx: number,
  fy: number,
  center: Position,
  zoomWindow: ZoomWindow,
  zoomLevel: number,
  canvasSize: number
): { tileX: number; tileY: number } {
  const { worldX, worldY } = finalCanvasToWorld(fx, fy, center, zoomWindow, zoomLevel, canvasSize);
  const tileX = Math.floor(worldX + 1e-6);
  const tileY = Math.floor(worldY + 1e-6);
  return { tileX, tileY };
}

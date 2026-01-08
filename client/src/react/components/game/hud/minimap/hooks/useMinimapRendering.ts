import { useRef, useCallback } from 'react';
import Canvas from '../../../../../../renderer/canvas';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';
import { drawPlayerIndicator, drawMarkers } from '../utils/renderingUtils';
import { computeZoomWindow } from '../utils/coordinateTransformations';
import type Player from '../../../../../../game/player/player';
import Position from '../../../../../../game/position';
import { MapMarker } from '../../../../../../types/map-marker';

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function useMinimapRendering(
  player: Player | null,
  markers: MapMarker[],
  markerImages: { [key: string]: HTMLImageElement },
  zoomLevel: number,
  canvasSize: number,
  renderLayer: number,
  getQuantizedCenter: () => Position,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const minimapCanvasRef = useRef<Canvas | null>(null);
  const prevCenterRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const chunksRef = useRef<any>({});
  
  const render = useCallback((chunks: any, force: boolean = false) => {
    if (!minimapCanvasRef.current) return;
    
    if (!force) {
      const now = performance.now();
      const timeSinceLastRender = now - lastRenderTimeRef.current;
      if (timeSinceLastRender < FRAME_INTERVAL) {
        if (renderRequestRef.current === null) {
          renderRequestRef.current = requestAnimationFrame(() => {
            renderRequestRef.current = null;
            lastRenderTimeRef.current = performance.now();
            render(chunksRef.current, false);
          });
        }
        return;
      }
      lastRenderTimeRef.current = now;
    }
    
    const center = getQuantizedCenter();
    const minimap = minimapCanvasRef.current;
    const offctx = minimap.context;
    const centerPoint = canvasSize / 2;

    // Always clear when floor changes, otherwise use optimization
    const canOptimize = prevCenterRef.current && prevCenterRef.current.z === renderLayer;
    const dx = canOptimize && prevCenterRef.current ? prevCenterRef.current.x - center.x : 0;
    const dy = canOptimize && prevCenterRef.current ? prevCenterRef.current.y - center.y : 0;
    const useOptimization = canOptimize && (dx !== 0 || dy !== 0) && Math.abs(dx) < canvasSize && Math.abs(dy) < canvasSize;

    if (useOptimization) {
      // Use optimization: copy and shift existing canvas
      offctx.save();
      offctx.globalCompositeOperation = 'copy';
      offctx.drawImage(minimap.canvas, dx, dy);
      offctx.restore();
      if (dx > 0) offctx.clearRect(0, 0, dx, canvasSize);
      else if (dx < 0) offctx.clearRect(canvasSize + dx, 0, -dx, canvasSize);
      if (dy > 0) offctx.clearRect(0, 0, canvasSize, dy);
      else if (dy < 0) offctx.clearRect(0, canvasSize + dy, canvasSize, -dy);
    } else {
      // Full clear
      offctx.clearRect(0, 0, canvasSize, canvasSize);
    }

    Object.keys(chunks).forEach((id: string) => {
      const ch = chunks[id];
      if (!ch || !ch.imageData) return;
      const [cx, cy, cz] = id.split('.').map(Number);
      if (cz !== renderLayer) return;

      offctx.putImageData(
        ch.imageData,
        cx * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE - center.x + centerPoint,
        cy * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE - center.y + centerPoint
      );
    });

    prevCenterRef.current = { x: center.x, y: center.y, z: renderLayer };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const zoomWindow = computeZoomWindow(zoomLevel, canvasSize);
    ctx.drawImage(
      minimap.canvas,
      zoomWindow.sourceOffset, zoomWindow.sourceOffset, zoomWindow.sourceSize, zoomWindow.sourceSize,
      0, 0, canvasSize, canvasSize
    );

    drawMarkers(ctx, markers, markerImages, center, zoomWindow, zoomLevel, canvasSize);
    if (player) {
      const p = player.getPosition();
      drawPlayerIndicator(ctx, p, center, zoomWindow, zoomLevel, canvasSize);
    }
  }, [renderLayer, getQuantizedCenter, canvasSize, player, markers, markerImages, zoomLevel, canvasRef]);
  
  return {
    minimapCanvasRef,
    chunksRef,
    prevCenterRef,
    render
  };
}

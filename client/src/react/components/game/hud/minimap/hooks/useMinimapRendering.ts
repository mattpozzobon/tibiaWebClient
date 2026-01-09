import { useRef, useCallback } from 'react';
import Canvas from '../../../../../../renderer/canvas';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';
import { drawPlayerIndicator, drawMarkers } from '../utils/renderingUtils';
import { computeZoomWindow } from '../utils/coordinateTransformations';
import type Player from '../../../../../../game/player/player';
import Position from '../../../../../../game/position';
import { MapMarker } from '../../../../../../types/map-marker';

// Reduced FPS to allow more time for chunk processing and prevent flickering
const TARGET_FPS = 30;
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
  const prevChunksCountRef = useRef<number>(0);
  const isRenderingRef = useRef<boolean>(false);
  
  const render = useCallback((chunks: any, force: boolean = false) => {
    if (!minimapCanvasRef.current) return;
    
    // Prevent concurrent renders
    if (isRenderingRef.current && !force) {
      // Schedule render for next frame if already rendering
      if (renderRequestRef.current === null) {
        renderRequestRef.current = requestAnimationFrame(() => {
          renderRequestRef.current = null;
          render(chunksRef.current, force);
        });
      }
      return;
    }
    
    isRenderingRef.current = true;
    
    // Check if chunks are being updated (count changed)
    const currentChunksCount = Object.keys(chunks).length;
    const chunksChanged = currentChunksCount !== prevChunksCountRef.current;
    prevChunksCountRef.current = currentChunksCount;
    
    if (!force) {
      const now = performance.now();
      const timeSinceLastRender = now - lastRenderTimeRef.current;
      if (timeSinceLastRender < FRAME_INTERVAL && !chunksChanged) {
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

    // Detect if center has changed significantly (fast movement)
    const centerChangedSignificantly = prevCenterRef.current && (
      Math.abs(prevCenterRef.current.x - center.x) > MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE ||
      Math.abs(prevCenterRef.current.y - center.y) > MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE ||
      prevCenterRef.current.z !== renderLayer
    );

    // First, check if we have any chunks for the current render layer
    const hasChunksForLayer = Object.keys(chunks).some((id: string) => {
      const ch = chunks[id];
      if (!ch || !ch.imageData) return false;
      const [, , cz] = id.split('.').map(Number);
      return cz === renderLayer;
    });

    // Build snapshot of ALL chunks for the layer (not just visible ones)
    // This ensures the minimap canvas is always up to date
    const allChunksForLayer = Object.keys(chunks).map((id: string) => {
      const ch = chunks[id];
      if (!ch || !ch.imageData) return null;
      const [cx, cy, cz] = id.split('.').map(Number);
      if (cz !== renderLayer) return null;
      
      const x = cx * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE - center.x + centerPoint;
      const y = cy * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE - center.y + centerPoint;
      
      // Create a copy of ImageData to prevent modification during rendering
      const size = MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE;
      const imageDataCopy = new ImageData(
        new Uint8ClampedArray(ch.imageData.data),
        size,
        size
      );
      return { imageData: imageDataCopy, x: Math.round(x), y: Math.round(y) };
    }).filter((item): item is { imageData: ImageData; x: number; y: number } => item !== null);

    // Filter to only visible chunks
    const visibleChunks = allChunksForLayer.filter(({ x, y }) => {
      return x + MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE >= -MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE && 
             x < canvasSize + MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE &&
             y + MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE >= -MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE && 
             y < canvasSize + MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE;
    });

    // CRITICAL: Only update minimap canvas if we have visible chunks
    // This prevents flickering by ensuring we never clear without content to draw
    const hasVisibleChunks = visibleChunks.length > 0;
    
    if (hasVisibleChunks) {
      // Fill with black background for unexplored areas, then draw visible chunks
      offctx.fillStyle = '#000000';
      offctx.fillRect(0, 0, canvasSize, canvasSize);
      visibleChunks.forEach(({ imageData, x, y }) => {
        offctx.putImageData(imageData, x, y);
      });
    }
    // If no visible chunks, preserve previous minimap canvas content
    // This prevents transparent flash when chunks are loading or center changes

    prevCenterRef.current = { x: center.x, y: center.y, z: renderLayer };
    
    // Update final canvas - ONLY if we have visible chunks
    // This ensures we never show a blank frame
    const canvas = canvasRef.current;
    if (!canvas) {
      isRenderingRef.current = false;
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isRenderingRef.current = false;
      return;
    }

    ctx.imageSmoothingEnabled = false;
    const zoomWindow = computeZoomWindow(zoomLevel, canvasSize);
    
    // ONLY update final canvas if we have visible chunks
    // This is the critical fix - never clear the final canvas unless we have visible content ready
    if (hasVisibleChunks) {
      // Fill with black background, then draw minimap canvas in one atomic operation
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.drawImage(
        minimap.canvas,
        zoomWindow.sourceOffset, zoomWindow.sourceOffset, zoomWindow.sourceSize, zoomWindow.sourceSize,
        0, 0, canvasSize, canvasSize
      );
      
      // Draw markers and player indicator on top
      drawMarkers(ctx, markers, markerImages, center, zoomWindow, zoomLevel, canvasSize);
      if (player) {
        const p = player.getPosition();
        drawPlayerIndicator(ctx, p, center, zoomWindow, zoomLevel, canvasSize);
      }
    } else if (!hasChunksForLayer && Object.keys(chunks).length === 0) {
      // Fill with black background if we truly have no chunks at all (initial load)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      // Still draw markers even if no map chunks
      drawMarkers(ctx, markers, markerImages, center, zoomWindow, zoomLevel, canvasSize);
      if (player) {
        const p = player.getPosition();
        drawPlayerIndicator(ctx, p, center, zoomWindow, zoomLevel, canvasSize);
      }
    }
    // If we have chunks but none are visible (fast movement, new chunks loading),
    // DO NOT TOUCH the final canvas - preserve previous frame completely
    // The minimap canvas is kept up to date above, so when chunks become visible, they're ready
    
    // Release rendering lock
    isRenderingRef.current = false;
  }, [renderLayer, getQuantizedCenter, canvasSize, player, markers, markerImages, zoomLevel, canvasRef]);
  
  return {
    minimapCanvasRef,
    chunksRef,
    prevCenterRef,
    render
  };
}

import { useRef, useCallback } from 'react';
import Position from '../../../../../../game/position';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';
import type GameClient from '../../../../../../core/gameclient';

export function useMinimapCache(
  gc: GameClient,
  canvasSize: number,
  getQuantizedCenter: () => Position,
  chunkUpdate: (chunks: any) => void
) {
  const cacheTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPanCacheRef = useRef(0);
  
  const cache = useCallback(() => {
    if (!gc.database || !gc.world) return;
    const center = getQuantizedCenter();
    const z = center.z;
    const chunkSize = MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE;
    
    // Calculate how many chunks we need in each direction to cover the canvas
    // Add extra margin to preload chunks outside visible area
    const EXTRA_CHUNKS = 2;
    const chunksPerSide = Math.ceil(canvasSize / chunkSize) + EXTRA_CHUNKS * 2;
    const halfChunks = Math.floor(chunksPerSide / 2);
    
    // Calculate the center chunk coordinates
    const centerChunkX = Math.floor(center.x / chunkSize);
    const centerChunkY = Math.floor(center.y / chunkSize);
    
    // Build a grid of chunk positions
    const positions: Position[] = [];
    for (let dx = -halfChunks; dx <= halfChunks; dx++) {
      for (let dy = -halfChunks; dy <= halfChunks; dy++) {
        const chunkX = centerChunkX + dx;
        const chunkY = centerChunkY + dy;
        // Use chunk center position (chunk coordinate * chunk size)
        positions.push(new Position(chunkX * chunkSize, chunkY * chunkSize, z));
      }
    }
    
    try {
      gc.database.preloadMinimapChunks(positions, chunkUpdate);
    } catch {}
  }, [gc.database, gc.world, chunkUpdate, getQuantizedCenter, canvasSize]);
  
  const schedulePanCache = useCallback(() => {
    const now = performance.now();
    const PAN_CACHE_MS = 80;
    if (now - lastPanCacheRef.current < PAN_CACHE_MS) return;
    lastPanCacheRef.current = now;
    cache();
  }, [cache]);
  
  const debouncedCache = useCallback(() => {
    if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    cacheTimeoutRef.current = setTimeout(() => { cache(); }, 100);
  }, [cache]);
  
  return {
    cache,
    schedulePanCache,
    debouncedCache,
    cacheTimeoutRef
  };
}

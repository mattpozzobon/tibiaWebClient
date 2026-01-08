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
    const EXTRA_MARGIN = MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE * 2;
    const radius = (canvasSize / 2) + EXTRA_MARGIN;
    const positions = [
      new Position(center.x, center.y, z),
      new Position(center.x - radius, center.y - radius, z),
      new Position(center.x, center.y - radius, z),
      new Position(center.x + radius, center.y - radius, z),
      new Position(center.x + radius, center.y, z),
      new Position(center.x + radius, center.y + radius, z),
      new Position(center.x, center.y + radius, z),
      new Position(center.x - radius, center.y + radius, z),
      new Position(center.x - radius, center.y, z)
    ];
    
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

import { useCallback, useRef } from 'react';
import { MINIMAP_CONFIG, MINIMAP_COLORS } from '../../../../../../config/minimap-config';
import type GameClient from '../../../../../../core/gameclient';
import type Player from '../../../../../../game/player/player';

export function useMinimapChunks(
  gc: GameClient,
  player: Player | null
) {
  const getTileColor = useCallback((tile: any) => {
    const itemColors = tile.items.map((i: any) => i.getMinimapColor()).filter((x: any) => x !== null);
    if (itemColors.length) return itemColors[itemColors.length - 1];
    return tile.getMinimapColor();
  }, []);
  
  // Batch chunk saves to prevent flickering from too many async operations
  const pendingSavesRef = useRef<Set<string>>(new Set());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const flushSaves = useCallback(() => {
    if (pendingSavesRef.current.size === 0 || !gc.database) return;
    const toSave = Array.from(pendingSavesRef.current);
    pendingSavesRef.current.clear();
    toSave.forEach((id: string) => {
      gc.database.saveMinimapChunk(id);
    });
    saveTimeoutRef.current = null;
  }, [gc.database]);
  
  const updateChunks = useCallback((chunks: any) => {
    if (!gc.world || !player || !gc.database) return;
    const currentFloor = player.getPosition().z;
    const modified = new Set<string>();
    
    // Collect all modifications first
    const modifications: Array<{ chunkId: string; pixelIndex: number; r: number; g: number; b: number }> = [];
    
    gc.world.chunks.forEach((chunk: any) => {
      const tiles = chunk.getFloorTiles(currentFloor);
      tiles.forEach((tile: any) => {
        if (!tile) return;
        if (!player!.canSee(tile)) return;
        const color = getTileColor(tile);
        if (color === null) return;
        const chunkId = gc.database.getMinimapChunkId(tile.getPosition());
        const buffer = chunks[chunkId];
        if (!buffer) return;
        
        // Fix: Use safe modulo to handle negative coordinates (prevents flicker on fast movement)
        const size = MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE;
        const posX = tile.getPosition().x;
        const posY = tile.getPosition().y;
        const x = ((posX % size) + size) % size;
        const y = ((posY % size) + size) % size;
        const pixelIndex = (y * size + x) * 4;
        
        const idx = (color ?? -1) | 0;
        let r = 0, g = 0, b = 0;
        if (idx >= 0 && idx < MINIMAP_COLORS.length) {
          [r, g, b] = MINIMAP_COLORS[idx];
        }
        
        modifications.push({ chunkId, pixelIndex, r, g, b });
        modified.add(chunkId);
      });
    });
    
    // Apply all modifications in one batch to minimize flickering
    modifications.forEach(({ chunkId, pixelIndex, r, g, b }) => {
      const buffer = chunks[chunkId];
      if (!buffer || !buffer.imageData) return;
      const data = buffer.imageData.data;
      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = 255;
    });
    
    // Batch saves: queue modified chunks and flush every ~150ms
    // This prevents flickering from too many async save operations during movement
    modified.forEach((id: string) => {
      pendingSavesRef.current.add(id);
    });
    
    // Debounce save flush
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(flushSaves, 150);
  }, [gc.world, player, gc.database, getTileColor, flushSaves]);
  
  return {
    updateChunks,
    flushSaves // Expose for cleanup
  };
}

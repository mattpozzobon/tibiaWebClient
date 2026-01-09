import { useCallback } from 'react';
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
  
  const updateChunks = useCallback((chunks: any) => {
    if (!gc.world || !player || !gc.database) return;
    const currentFloor = player.getPosition().z;
    const modified = new Set<string>();
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
        const x = tile.getPosition().x % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE;
        const y = tile.getPosition().y % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE;
        const pixelIndex = (y * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE + x) * 4; // 4 bytes per pixel (RGBA)
        
        const idx = (color ?? -1) | 0;
        let r = 0, g = 0, b = 0;
        if (idx >= 0 && idx < MINIMAP_COLORS.length) {
          // Get RGB tuple directly - no conversion needed!
          [r, g, b] = MINIMAP_COLORS[idx];
        }
        
        // Write RGB directly to ImageData buffer (A is always 255 for fully opaque)
        const data = buffer.imageData.data;
        data[pixelIndex] = r;     // R
        data[pixelIndex + 1] = g; // G
        data[pixelIndex + 2] = b; // B
        data[pixelIndex + 3] = 255; // A (always fully opaque)
        modified.add(chunkId);
      });
    });
    modified.forEach((id: string) => gc.database.saveMinimapChunk(id));
  }, [gc.world, player, gc.database, getTileColor]);
  
  return {
    updateChunks
  };
}

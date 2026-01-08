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
        const index =
          (tile.getPosition().x % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE) +
          ((tile.getPosition().y % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE) * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE);
        const DEFAULT_COLOR = 0xFF000000;
        const idx = (color ?? -1) | 0;
        const colorValue = MINIMAP_COLORS[idx] ?? DEFAULT_COLOR;
        buffer.view[index] = colorValue;
        modified.add(chunkId);
      });
    });
    modified.forEach((id: string) => gc.database.saveMinimapChunk(id));
  }, [gc.world, player, gc.database, getTileColor]);
  
  return {
    updateChunks
  };
}

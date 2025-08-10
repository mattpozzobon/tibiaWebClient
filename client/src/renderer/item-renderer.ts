import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import Interface from "../ui/interface";
import { BatchSprite } from "../types/types";

export default class ItemRenderer {
  constructor() {}

  public collectSpritesForTile(tile: Tile, screenPos: Position, spriteBatches: Map<number, BatchSprite[]>): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();

    const tileHasOnTop = this.hasOnTop(items);
    const shouldOutlineBase = currentHoverTile === tile && !tileHasOnTop;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const outlineThis = shouldOutlineBase && i === items.length - 1 && item.isPickupable();
      this.collectSpriteForItem(item, screenPos, tile.__renderElevation, Interface.TILE_SIZE, spriteBatches, outlineThis);

      if (item.isElevation && item.isElevation()) {
        tile.addElevation(item.getDataObject().properties.elevation);
      }
    }
  }

  private hasOnTop(items: Item[]): boolean {
    return items.some(i => i.hasFlag(PropBitFlag.DatFlagOnTop));
  }

  public collectOnTopSpritesForTile(tile: Tile, screenPos: Position, spriteBatches: Map<number, BatchSprite[]>): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();

    let lastOnTop = -1;
    for (let i = 0; i < items.length; ++i) if (items[i].hasFlag(PropBitFlag.DatFlagOnTop)) lastOnTop = i;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const outlineThis = currentHoverTile === tile && i === lastOnTop && item.isPickupable();
      this.collectSpriteForItem(item, screenPos, 0, Interface.TILE_SIZE, spriteBatches, outlineThis);
    }
  }

  private collectSpriteForItem(
    thing: any,
    position: Position,
    elevation: number,
    size: number,
    spriteBatches: Map<number, BatchSprite[]>,
    outline: boolean = false
  ): void {
    const frameGroup = thing.getFrameGroup(FrameGroup.NONE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();

    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          const index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          const texture = frameGroup.getSprite(index);
          if (!texture) continue;

          const textureKey = texture.source.uid as number; // unify on source.uid
          if (!spriteBatches.has(textureKey)) spriteBatches.set(textureKey, []);

          const xCell = position.x - x - elevation;
          const yCell = position.y - y - elevation;
          if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) continue;

          spriteBatches.get(textureKey)!.push({
            sprite: { texture },
            x: size * xCell,
            y: size * yCell,
            width: size,
            height: size,
            outline,
          });
        }
      }
    }
  }
}

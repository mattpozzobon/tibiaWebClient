import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import Interface from "../ui/interface";
import SpriteBatcher from "./sprite-batcher";

import type { DimStyle } from "./renderer";
import TileLighting from "./tile-lighting";

export default class ItemRenderer {
  private lighting: TileLighting;

  constructor(lighting = new TileLighting()) {
    this.lighting = lighting;
  }

  public collectSpritesForTile(tile: Tile, screenPos: Position, batcher: SpriteBatcher): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();

    const tileHasOnTop = items.some(i => i.hasFlag(PropBitFlag.DatFlagOnTop));
    const shouldOutlineBase = currentHoverTile === tile && !tileHasOnTop;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const outlineThis = shouldOutlineBase && i === items.length - 1 && item.isPickupable();

      // per-item style (deferred to lighting class)
      const style = this.lighting?.styleFor(tile) as DimStyle | undefined;

      this.collectSpriteForItem(
        item,
        screenPos,
        tile.__renderElevation,
        Interface.TILE_SIZE,
        batcher,
        outlineThis,
        style
      );

      if (item.isElevation && item.isElevation()) {
        tile.addElevation(item.getDataObject().properties.elevation);
      }
    }
  }

  public collectOnTopSpritesForTile(tile: Tile, screenPos: Position, batcher: SpriteBatcher): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();

    let lastOnTop = -1;
    for (let i = 0; i < items.length; ++i) if (items[i].hasFlag(PropBitFlag.DatFlagOnTop)) lastOnTop = i;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const outlineThis = currentHoverTile === tile && i === lastOnTop && item.isPickupable();

      // per-item style (deferred to lighting class)
      const style = this.lighting?.styleFor(tile) as DimStyle | undefined;

      this.collectSpriteForItem(
        item,
        screenPos,
        tile.__renderElevation, // keep as-is; use 0 here if you want strict "onTop" elevation
        Interface.TILE_SIZE,
        batcher,
        outlineThis,
        style
      );
    }
  }

  private collectSpriteForItem(
    thing: any,
    position: Position,
    elevation: number,
    size: number,
    batcher: SpriteBatcher,
    outline: boolean = false,
    style?: DimStyle
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

          const xCell = position.x - x - elevation;
          const yCell = position.y - y - elevation;
          if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) continue;

          batcher.push(
            texture,
            size * xCell,
            size * yCell,
            size,
            size,
            outline,
            style
          );
        }
      }
    }
  }
}

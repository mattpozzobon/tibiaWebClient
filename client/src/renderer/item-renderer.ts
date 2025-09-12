// src/renderer/item-renderer.ts
import { Texture } from 'pixi.js';
import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import Interface from "../ui/interface";
import SpriteBatcher from "./sprite-batcher";

import TileLighting, { TileLightStyle } from "./tile-lighting";
import LightRenderer from "./light-renderer";

export default class ItemRenderer {
  private lighting: TileLighting;
  private light: LightRenderer;

  constructor(light: LightRenderer, lighting = new TileLighting()) {
    this.lighting = lighting;
    this.light = light;
  }

  public collectSpritesForTile(tile: Tile, screenPos: Position, batcher: SpriteBatcher): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();

    const tileHasOnTop = items.some(i => i.hasFlag(PropBitFlag.DatFlagOnTop));
    const shouldOutlineBase = currentHoverTile === tile && !tileHasOnTop;

    const tileZ = tile.getPosition().z;
    const size = Interface.TILE_SIZE;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const outlineThis = shouldOutlineBase && i === items.length - 1 && item.isPickupable();

      // Per-item style (deferred to lighting class)
      const style = this.lighting?.styleFor(tile) as TileLightStyle | undefined;

      // --- bubble lighting for light-emitting items (collect by floor) ---
      if (item.isLight()) {
        const info = item.getDataObject().properties.light;
        if (info) {
          // Pass the item's floor Z so lower-floor lights get sandwiched/masked correctly
          this.light.addLightBubble(screenPos.x, screenPos.y, info.level, info.color, tileZ);
        }
      }

      // Draw sprites and register them as occluders (exact shapes)
      this.collectSpriteForItem(
        item,
        screenPos,
        tile.__renderElevation,
        size,
        batcher,
        outlineThis,
        style,
        tileZ // occluder floor
      );

      if (item.isElevation && item.isElevation()) {
        tile.addElevation(item.getDataObject().properties.elevation);
      }
    }
  }

  public collectOnTopSpritesForTile(tile: Tile, screenPos: Position, batcher: SpriteBatcher): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();

    const tileZ = tile.getPosition().z;
    const size = Interface.TILE_SIZE;

    let lastOnTop = -1;
    for (let i = 0; i < items.length; ++i) if (items[i].hasFlag(PropBitFlag.DatFlagOnTop)) lastOnTop = i;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const outlineThis = currentHoverTile === tile && i === lastOnTop && item.isPickupable();

      // Per-item style (deferred to lighting class)
      const style = this.lighting?.styleFor(tile) as TileLightStyle | undefined;

      // Bubble lighting for on-top items too (collect by floor)
      if (item.isLight()) {
        const info = item.getDataObject().properties.light;
        if (info) {
          this.light.addLightBubble(screenPos.x, screenPos.y, info.level, info.color, tileZ);
        }
      }

      // Draw sprites and register them as occluders (exact shapes)
      this.collectSpriteForItem(
        item,
        screenPos,
        tile.__renderElevation,
        size,
        batcher,
        outlineThis,
        style,
        tileZ // occluder floor
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
    style?: TileLightStyle,
    occluderZ?: number
  ): void {
    const frameGroup = thing.getFrameGroup(FrameGroup.NONE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();

    // Fast path: 1x1x1
    if (frameGroup.width === 1 && frameGroup.height === 1 && frameGroup.layers === 1) {
      const index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, 0, 0);
      const texture = frameGroup.getSprite(index) as Texture | undefined;
      if (!texture) return;

      const xCell = position.x - 0 - elevation;
      const yCell = position.y - 0 - elevation;
      if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) return;

      const px = size * xCell;
      const py = size * yCell;

      batcher.push(texture, px, py, size, size, outline, style);
      if (occluderZ !== undefined) {
        this.light.addOccluderSprite(occluderZ, texture, px, py, size, size);
      }
      return;
    }

    // General case: width/height/layers
    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          const index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          const texture = frameGroup.getSprite(index) as Texture | undefined;
          if (!texture) continue;

          const xCell = position.x - x - elevation;
          const yCell = position.y - y - elevation;
          if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) continue;

          const px = size * xCell;
          const py = size * yCell;

          batcher.push(texture, px, py, size, size, outline, style);
          if (occluderZ !== undefined) {
            this.light.addOccluderSprite(occluderZ, texture, px, py, size, size);
          }
        }
      }
    }
  }
}

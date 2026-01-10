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

    // Check if this tile is being hovered
    const isHovered = currentHoverTile === tile;

    const tileZ = tile.getPosition().z;
    const size = Interface.TILE_SIZE;
    
    // Cache base style calculation - same for all items on the tile
    const baseStyle = this.lighting?.styleFor(tile) as TileLightStyle | undefined;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const isHoveredItem = isHovered;
      const isPickupable = item.isPickupable();

      // For pickupable items: use outline effect
      // For non-pickupable items (walls, doors, stairs): use orange pulsating effect
      let shouldOutline = false;
      let style = baseStyle;
      
      if (isHoveredItem) {
        if (isPickupable) {
          // Pickupable items get outline
          shouldOutline = true;
        } else {
          // Non-pickupable items get orange pulsating effect
          const time = performance.now();
          const pulseSpeed = 0.005; // Faster pulsation speed
          const pulseIntensity = (Math.sin(time * pulseSpeed) + 1) / 2; // 0 to 1
          
          // Vary tint intensity from 0.3 to 1.0 for more visible pulsation
          const minTintIntensity = 0.3;
          const maxTintIntensity = 1.0;
          const tintIntensity = minTintIntensity + (maxTintIntensity - minTintIntensity) * pulseIntensity;
          
          // Base orange color
          const baseOrange = 0xFFA500; // Orange
          
          // Calculate pulsating tint by interpolating between white (no tint) and orange
          const r = Math.floor(255 + (0xFF - 255) * tintIntensity);
          const g = Math.floor(255 + (0xA5 - 255) * tintIntensity);
          const b = Math.floor(255 + (0x00 - 255) * tintIntensity);
          const pulsatingTint = (r << 16) | (g << 8) | b;
          
          // Use normal blend mode to avoid transparency issues
          style = {
            ...baseStyle,
            tint: pulsatingTint
            // Don't set alpha - let it use the base style's alpha or default to full opacity
          };
        }
      }

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
        shouldOutline, // Outline for pickupable items
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

    // Check if this tile is being hovered
    const isHovered = currentHoverTile === tile;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      const isHoveredItem = isHovered;
      const isPickupable = item.isPickupable();

      // For pickupable items: use outline effect
      // For non-pickupable items (walls, doors, stairs): use orange pulsating effect
      let shouldOutline = false;
      const baseStyle = this.lighting?.styleFor(tile) as TileLightStyle | undefined;
      let style = baseStyle;
      
      if (isHoveredItem) {
        if (isPickupable) {
          // Pickupable items get outline
          shouldOutline = true;
        } else {
          // Non-pickupable items get orange pulsating effect
          const time = performance.now();
          const pulseSpeed = 0.005; // Faster pulsation speed
          const pulseIntensity = (Math.sin(time * pulseSpeed) + 1) / 2; // 0 to 1
          
          // Vary tint intensity from 0.3 to 1.0 for more visible pulsation
          const minTintIntensity = 0.3;
          const maxTintIntensity = 1.0;
          const tintIntensity = minTintIntensity + (maxTintIntensity - minTintIntensity) * pulseIntensity;
          
          // Base orange color
          const baseOrange = 0xFFA500; // Orange
          
          // Calculate pulsating tint by interpolating between white (no tint) and orange
          const r = Math.floor(255 + (0xFF - 255) * tintIntensity);
          const g = Math.floor(255 + (0xA5 - 255) * tintIntensity);
          const b = Math.floor(255 + (0x00 - 255) * tintIntensity);
          const pulsatingTint = (r << 16) | (g << 8) | b;
          
          // Use normal blend mode to avoid transparency issues
          style = {
            ...baseStyle,
            tint: pulsatingTint
            // Don't set alpha - let it use the base style's alpha or default to full opacity
          };
        }
      }

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
        shouldOutline, // Outline for pickupable items
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
      if (xCell < -1 || xCell > Interface.TILE_WIDTH + 1 || yCell < -1 || yCell > Interface.TILE_HEIGHT + 1) return;

      const px = Math.round(size * xCell);
      const py = Math.round(size * yCell);

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
          if (xCell < -1 || xCell > Interface.TILE_WIDTH + 1 || yCell < -1 || yCell > Interface.TILE_HEIGHT + 1) continue;

          const px = Math.round(size * xCell);
          const py = Math.round(size * yCell);

          batcher.push(texture, px, py, size, size, outline, style);
          if (occluderZ !== undefined) {
            this.light.addOccluderSprite(occluderZ, texture, px, py, size, size);
          }
        }
      }
    }
  }
}

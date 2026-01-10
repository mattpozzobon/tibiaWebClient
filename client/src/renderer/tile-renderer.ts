// src/renderer/tile-renderer.ts
import { Texture } from 'pixi.js';
import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";
import AnimationRenderer from "./animation-renderer";
import Interface from "../ui/interface";
import SpriteBatcher from "./sprite-batcher";
import TileLighting from "./tile-lighting";
import LightRenderer from "./light-renderer";

export default class TileRenderer {
  private animationRenderer: AnimationRenderer;
  private lighting: TileLighting;
  private light: LightRenderer;

  constructor(animationRenderer: AnimationRenderer, light: LightRenderer, lighting = new TileLighting()) {
    this.animationRenderer = animationRenderer;
    this.lighting = lighting;
    this.light = light;
  }

  public collectSprites(tile: Tile, screenPos: Position, batcher: SpriteBatcher): void {
    tile.setElevation(0);
    const xCell = screenPos.x;
    const yCell = screenPos.y;
    if (xCell < -1 || xCell > Interface.TILE_WIDTH + 1 || yCell < -1 || yCell > Interface.TILE_HEIGHT + 1) return;

    const size = Interface.TILE_SIZE;
    const tileZ = tile.getPosition().z;

    // Check if this tile is being hovered (applies to all tile types: floors, walls, stairs, etc.)
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();
    const isHovered = currentHoverTile === tile;
    // Don't color the tile if it has items (items will be highlighted instead)
    const hasItems = tile.items.length > 0;

    let fg: FrameGroup;
    try { fg = tile.getFrameGroup(FrameGroup.NONE); } catch { return; }

    const f = tile.getFrame();
    const p = tile.getPattern();
    const baseStyle = this.lighting?.styleFor(tile);
    
    // Apply orange pulsating hover effect (only if tile has no items)
    let style = baseStyle;
    if (isHovered && !hasItems) {
      // Pulsating effect using sine wave - more visible by varying tint intensity
      const time = performance.now();
      const pulseSpeed = 0.005; // Faster pulsation speed
      const pulseIntensity = (Math.sin(time * pulseSpeed) + 1) / 2; // 0 to 1
      
      // Vary tint intensity from 0.5 to 1.0 for more visible pulsation
      const minTintIntensity = 0.5;
      const maxTintIntensity = 1.0;
      const tintIntensity = minTintIntensity + (maxTintIntensity - minTintIntensity) * pulseIntensity;
      
      // Calculate pulsating tint by interpolating between white (no tint) and orange
      // This creates a smooth transition from subtle orange to full orange
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

    if (tile.isLight()) {
      const info = tile.getDataObject().properties.light;
      if (info) {
        this.light.addLightBubble(screenPos.x, screenPos.y, info.level, info.color, tileZ);
      }
    }

    if (fg.width === 1 && fg.height === 1 && fg.layers === 1) {
      const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, 0, 0, 0);
      const tex = fg.getSprite(sid) as Texture | undefined;
      if (tex) {
        const px = Math.round(xCell * size);
        const py = Math.round(yCell * size);
        batcher.push(tex, px, py, size, size, false, style);
        this.light.addOccluderSprite(tileZ, tex, px, py, size, size);
      }
      return;
    }

    for (let l = 0; l < fg.layers; l++) {
      for (let cx = 0; cx < fg.width; cx++) {
        for (let cy = 0; cy < fg.height; cy++) {
          const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, l, cx, cy);
          const tex = fg.getSprite(sid) as Texture | undefined;
          if (!tex) continue;

          const xCellDraw = xCell - cx - tile.__renderElevation;
          const yCellDraw = yCell - cy - tile.__renderElevation;
          if (xCellDraw < -1 || xCellDraw > Interface.TILE_WIDTH + 1 || yCellDraw < -1 || yCellDraw > Interface.TILE_HEIGHT + 1) continue;

          const px = Math.round(xCellDraw * size);
          const py = Math.round(yCellDraw * size);

          // Apply hover tint to all layers when hovered
          batcher.push(tex, px, py, size, size, false, style);
          this.light.addOccluderSprite(tileZ, tex, px, py, size, size);
        }
      }
    }
  }

  public collectAnimationSprites(
    tile: Tile,
    _screenPos: Position,
    batcher: SpriteBatcher,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    this.animationRenderer.renderTileAnimations(tile, batcher, getStaticScreenPosition);
  }
}

// utils/item-renderer.ts
import type GameClient from "../core/gameclient";
import type Item from "../game/item";
import FrameGroup from "./frame-group";
import Position from "../game/position";

type DrawPiece = {
  src: HTMLImageElement | HTMLCanvasElement;
  sx: number; sy: number; sw: number; sh: number;
  dx: number; dy: number; dw: number; dh: number;
};

export class ItemRenderer {
  /**
   * Renders an item sprite to a canvas element
   * @param gc - The game client instance
   * @param item - The item to render
   * @param canvas - The canvas element to render to
   * @param options - Rendering options
   */
  static renderItemToCanvas(
    gc: GameClient,
    item: Item,
    canvas: HTMLCanvasElement,
    options: {
      size?: number;
      padding?: number;
      background?: string;
      position?: Position;
    } = {}
  ): boolean {
    const size = options.size ?? 32;
    const padding = options.padding ?? 0;
    const background = options.background ?? "transparent";
    const position = options.position ?? new Position(0, 0, 0);

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    const collected = ItemRenderer.collectItemDrawPieces(gc, item, position);
    if (!collected) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return false;
    }

    const { pieces, bounds } = collected;
    const contentW = bounds.right - bounds.left;
    const contentH = bounds.bottom - bounds.top;
    const maxScale = Math.min((canvas.width - padding * 2) / contentW, (canvas.height - padding * 2) / contentH);
    const scale = Math.max(1, Math.floor(maxScale));
    const drawW = Math.floor(contentW * scale);
    const drawH = Math.floor(contentH * scale);
    const originX = Math.floor((canvas.width - drawW) / 2);
    const originY = Math.floor((canvas.height - drawH) / 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.imageSmoothingEnabled = false;
    const EPS = 0.01;

    for (const p of pieces) {
      const dx = originX + Math.floor((p.dx - bounds.left) * scale);
      const dy = originY + Math.floor((p.dy - bounds.top) * scale);
      const dw = Math.floor(p.dw * scale);
      const dh = Math.floor(p.dh * scale);

      const sx = p.sx + EPS;
      const sy = p.sy + EPS;
      const sw = p.sw - EPS * 2;
      const sh = p.sh - EPS * 2;

      ctx.drawImage(p.src, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    return true;
  }

  /**
   * Gets the sprite texture for an item
   * @param gc - The game client instance
   * @param item - The item to get the sprite for
   * @returns The texture or null if not found
   */
  static getItemSprite(gc: GameClient, item: Item): any | null {
    try {
      const frameGroup = item.getFrameGroup(FrameGroup.NONE);
      const frame = item.getFrame();
      const pattern = item.getPattern();

      // For simple 1x1 items, get the sprite directly
      if (frameGroup.width === 1 && frameGroup.height === 1 && frameGroup.layers === 1) {
        const index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, 0, 0);
        return frameGroup.getSprite(index);
      }

      // For multi-tile items, get the first sprite
      const index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, 0, 0);
      return frameGroup.getSprite(index);
    } catch (error) {
      console.error('ItemRenderer.getItemSprite: error', error);
      return null;
    }
  }

  /**
   * Gets item information for display purposes
   * @param item - The item to get info for
   * @returns Object with item display information
   */
  static getItemInfo(item: Item): { id: number; count: number; isStackable: boolean } {
    return {
      id: item.id,
      count: item.count,
      isStackable: item.isStackable()
    };
  }

  /**
   * Collects draw pieces for an item (internal method)
   */
  private static collectItemDrawPieces(
    gc: GameClient,
    item: Item,
    position: Position
  ): { pieces: DrawPiece[]; bounds: { left: number; top: number; right: number; bottom: number } } | null {
    try {
      const frameGroup = item.getFrameGroup(FrameGroup.NONE);
      const frame = item.getFrame();
      const pattern = item.getPattern();

      const pieces: DrawPiece[] = [];
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;

      // Handle different item sizes
      for (let x = 0; x < frameGroup.width; x++) {
        for (let y = 0; y < frameGroup.height; y++) {
          for (let l = 0; l < frameGroup.layers; l++) {
            const index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
            const texture = frameGroup.getSprite(index);
            
            if (!texture) continue;

            // Get the texture source and frame
            const src = texture.baseTexture?.resource?.source || texture.source?.resource;
            if (!src) continue;

            // Calculate sprite dimensions (assuming 32x32 sprites)
            const spriteSize = 32;
            const dx = (position.x - x) * spriteSize;
            const dy = (position.y - y) * spriteSize;
            const dw = spriteSize;
            const dh = spriteSize;

            // Get source coordinates from texture
            const sx = texture.frame?.x || 0;
            const sy = texture.frame?.y || 0;
            const sw = texture.frame?.width || spriteSize;
            const sh = texture.frame?.height || spriteSize;

            pieces.push({ src, sx, sy, sw, sh, dx, dy, dw, dh });

            if (dx < left) left = dx;
            if (dy < top) top = dy;
            if (dx + dw > right) right = dx + dw;
            if (dy + dh > bottom) bottom = dy + dh;
          }
        }
      }

      if (!pieces.length) return null;
      return { pieces, bounds: { left, top, right, bottom } };
    } catch (error) {
      console.error('ItemRenderer.collectItemDrawPieces: error', error);
      return null;
    }
  }
}

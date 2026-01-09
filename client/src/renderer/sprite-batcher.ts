import { Texture, BLEND_MODES } from 'pixi.js';
import type { BatchSprite } from '../types/types';
import { TileLightStyle } from './tile-lighting';


export default class SpriteBatcher {
  private batches = new Map<number, BatchSprite[]>();

  reset(): void {
    // Reuse arrays instead of clearing - more efficient for frequent resets
    for (const arr of this.batches.values()) {
      if (arr.length > 0) arr.length = 0;
    }
  }

  push(texture: Texture, x: number, y: number, w: number, h: number, outline = false, style?: TileLightStyle): void {
    const key = texture.source.uid; // number, stable per base texture
    let arr = this.batches.get(key);
    if (!arr) {
      arr = [];
      this.batches.set(key, arr);
    }
    // Avoid spread operator - conditionally set style properties to reduce allocations
    const sprite: BatchSprite = {
      sprite: { texture },
      x, y,
      width: w,
      height: h,
      outline,
    } as BatchSprite;
    if (style) {
      if (style.tint !== undefined) sprite.tint = style.tint;
      if (style.alpha !== undefined) sprite.alpha = style.alpha;
      if (style.blendMode !== undefined) sprite.blendMode = style.blendMode as BLEND_MODES;
    }
    arr.push(sprite);
  }

  forEach(cb: (key: number, sprites: BatchSprite[]) => void): void {
    for (const [key, arr] of this.batches) {
      if (arr.length) cb(key, arr);
    }
  }
}

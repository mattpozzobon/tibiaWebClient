import { Texture } from 'pixi.js';
import type { BatchSprite } from '../types/types';

export default class SpriteBatcher {
  private batches = new Map<number, BatchSprite[]>();

  reset(): void {
    for (const arr of this.batches.values()) arr.length = 0;
  }

  push(texture: Texture, x: number, y: number, w: number, h: number, outline = false): void {
    const key = texture.baseTexture.uid; // number, stable per base texture
    let arr = this.batches.get(key);
    if (!arr) {
      arr = [];
      this.batches.set(key, arr);
    }
    arr.push({
      sprite: { texture },
      x, y,
      width: w,
      height: h,
      outline,
    } as BatchSprite);
  }

  forEach(cb: (key: number, sprites: BatchSprite[]) => void): void {
    for (const [key, arr] of this.batches) {
      if (arr.length) cb(key, arr);
    }
  }
}

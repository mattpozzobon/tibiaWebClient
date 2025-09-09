// src/renderer/light-renderer.ts
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import Interface from '../ui/interface';

export default class LightRenderer {
  public readonly layer: Container;
  private darkness: Graphics;
  private lightContainer: Container;
  private lightTextures: Map<string, Texture> = new Map();

  constructor() {
    this.layer = new Container();
    this.darkness = new Graphics();
    this.layer.addChild(this.darkness);
    this.lightContainer = new Container();
    this.layer.addChild(this.lightContainer);
  }

  public begin(width: number, height: number, ambientAlpha = 0.8) {
    this.lightContainer.removeChildren();
    this.darkness.clear();
    this.darkness.rect(-2, -2, width + 4, height + 4);
    this.darkness.fill({ color: 0x000000, alpha: ambientAlpha });
  }

  public addLightBubble(tileX: number, tileY: number, sizeTiles: number, colorByte: number) {
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const radius = Math.max(1, sizeTiles * Interface.TILE_SIZE);
    const texture = this.createLightTexture(radius);

    const erase = new Sprite(texture);
    erase.anchor.set(0.5);
    erase.position.set(cx, cy);
    erase.alpha = 1;
    erase.blendMode = 'erase';
    this.lightContainer.addChild(erase);

    // const { r, g, b } = this.colorFromByte(colorByte);
    // const glow = new Sprite(texture);
    // glow.anchor.set(0.5);
    // glow.position.set(cx, cy);
    // glow.tint = (r << 16) | (g << 8) | b;
    // glow.alpha = 0.45;
    // glow.blendMode = 'add';
    // this.lightContainer.addChild(glow);
  }

  public end() {}

  private createLightTexture(radius: number): Texture {
    const key = `${radius | 0}`;
    const cached = this.lightTextures.get(key);
    if (cached) return cached;

    const diameter = Math.max(2, (radius * 2) | 0);
    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext('2d')!;
    const cx = diameter / 2;
    const cy = diameter / 2;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0.0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    const texture = Texture.from(canvas);
    this.lightTextures.set(key, texture);
    return texture;
  }

  private colorFromByte(colorByte: number) {
    const r = 51 * (Math.floor(colorByte / 36) % 6);
    const g = 51 * (Math.floor(colorByte / 6) % 6);
    const b = 51 * (colorByte % 6);
    return { r, g, b };
  }
}

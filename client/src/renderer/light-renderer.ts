// src/renderer/light-renderer.ts
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import Interface from '../ui/interface';

type RGBA = { r: number; g: number; b: number; a: number };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpRGBA(from: RGBA, to: RGBA, t: number): RGBA {
  return { r: lerp(from.r, to.r, t), g: lerp(from.g, to.g, t), b: lerp(from.b, to.b, t), a: lerp(from.a, to.a, t) };
}

// Tibia palette → RGB (same mapping as your canvas version)
function tibiaColorToRGB(color: number) {
  const r = 51 * (Math.floor(color / 36) % 6);
  const g = 51 * (Math.floor(color / 6)  % 6);
  const b = 51 * (color % 6);
  return { r, g, b };
}
function rgbToTint({ r, g, b }: { r: number; g: number; b: number }) {
  return (r << 16) | (g << 8) | b;
}

export default class LightRenderer {
  public layer: Container;
  private darkness: Graphics;

  private ambient: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private ambientStart: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private ambientTarget: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private steps = 0;
  private counter = 0;

  private readonly DARKNESS: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  // alpha-only radial texture cache (reused for both mask + glow)
  private alphaGradientCache = new Map<number, Texture>();

  constructor() {
    this.layer = new Container();
    this.darkness = new Graphics();
    this.darkness.blendMode = 'normal';      // overlay black normally; we’ll punch holes with 'erase'
    this.layer.addChild(this.darkness);
  }

  public setAmbientColor(r: number, g: number, b: number, a: number) {
    this.ambientTarget = { r, g, b, a };
    this.ambientStart = { ...this.ambient };
    const f1 = Math.abs(this.ambientStart.r - this.ambientTarget.r);
    const f2 = Math.abs(this.ambientStart.g - this.ambientTarget.g);
    const f3 = Math.abs(this.ambientStart.b - this.ambientTarget.b);
    const f4 = Math.abs(this.ambientStart.a - this.ambientTarget.a);
    this.steps = 2 * Math.max(f1, f2, f3, f4);
    this.counter = this.steps;
  }

  private getNightSine(): number {
    const unix = window.gameClient.world.clock.getUnix();
    return Math.sin(0.25 * Math.PI + (2 * Math.PI * unix) / (24 * 60 * 60 * 1000));
  }
  private getDarknessFraction(): number {
    let fraction = 0.5 * (this.getNightSine() + 1);
    if (window.gameClient.player!.isUnderground()) fraction = 1;
    return fraction;
  }
  private getInterpT(): number {
    return this.steps > 0 ? (this.counter - 1) / this.steps : 0;
  }

  /** Call once per frame before adding bubbles. */
  public begin(width: number, height: number) {
    if (this.counter > 0) {
      this.ambient = lerpRGBA(this.ambientTarget, this.ambientStart, this.getInterpT());
      this.counter--;
    }

    // ambient → night blend
    const night = this.getDarknessFraction();
    const ambientNight = lerpRGBA(this.ambient, this.DARKNESS, night);

    // cover whole game area (slightly oversized for scaling edge)
    this.darkness.clear();
    this.darkness.beginFill(0x000000, ambientNight.a / 255);
    this.darkness.drawRect(-2, -2, width + 4, height + 4);
    this.darkness.endFill();

    // keep darkness as first child so bubbles drawn after can 'erase'
    if (this.layer.children[0] !== this.darkness) {
      this.layer.removeChild(this.darkness);
      this.layer.addChildAt(this.darkness, 0);
    }
  }

  /**
   * Add a light bubble centered on a tile.
   * 1) an 'erase' sprite punches a hole in darkness (reveals scene)
   * 2) an 'add' sprite adds a faint colored glow
   */
  public addLightBubble(tileX: number, tileY: number, sizeTiles: number, colorByte: number) {
    if (colorByte < 0 || colorByte >= 216) return;

    // FIX: center on the tile (top-left cell is tileX, tileY) -> +0.5
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const radiusPx = Math.max(1, sizeTiles * Interface.TILE_SIZE);

    // old canvas scaled by 0.5 * night
    const intensity = 0.5 * this.getDarknessFraction();

    const tex = this.getAlphaGradientTexture(radiusPx);

    // (1) punch a hole using alpha-only gradient
    const hole = new Sprite(tex);
    hole.anchor.set(0.5);
    hole.position.set(cx, cy);
    hole.blendMode = 'erase';
    hole.alpha = 1.0;
    this.layer.addChild(hole);

    // (2) add a colored glow on top (optional, looks like your old pink glow)
    const glow = new Sprite(tex);
    glow.anchor.set(0.5);
    glow.position.set(cx, cy);
    glow.blendMode = 'add';
    glow.tint = rgbToTint(tibiaColorToRGB(colorByte));
    glow.alpha = intensity; // matches old canvas intensity behavior
    this.layer.addChild(glow);
  }

  /** Remove bubbles (keep darkness). */
  public end() {
    if (this.layer.children.length > 1) {
      this.layer.removeChildren(1);
    }
  }

  private getAlphaGradientTexture(radiusPx: number): Texture {
    const key = radiusPx | 0;
    const found = this.alphaGradientCache.get(key);
    if (found) return found;

    const diameter = Math.max(2, (radiusPx * 2) | 0);
    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext('2d')!;

    const cx = radiusPx, cy = radiusPx;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);

    // alpha falloff (like a1..a4). Color comes from sprite.tint.
    grd.addColorStop(0.00, 'rgba(255,255,255,1.0)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.5)');
    grd.addColorStop(0.50, 'rgba(255,255,255,0.25)');
    grd.addColorStop(0.75, 'rgba(255,255,255,0.125)');
    grd.addColorStop(1.00, 'rgba(255,255,255,0)');

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fill();

    const tex = Texture.from(canvas);
    this.alphaGradientCache.set(key, tex);
    return tex;
  }
}

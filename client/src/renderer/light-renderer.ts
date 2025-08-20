// src/renderer/light-renderer.ts
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import Interface from '../ui/interface';

type RGBA = { r: number; g: number; b: number; a: number };

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function lerpRGBA(from: RGBA, to: RGBA, t: number): RGBA {
  return {
    r: lerp(from.r, to.r, t),
    g: lerp(from.g, to.g, t),
    b: lerp(from.b, to.b, t),
    a: lerp(from.a, to.a, t),
  };
}

function tibiaColorToRGB(colorByte: number) {
  // 6x6x6 cube, each step = 51
  const r = 51 * (Math.floor(colorByte / 36) % 6);
  const g = 51 * (Math.floor(colorByte / 6)  % 6);
  const b = 51 * (colorByte % 6);
  return { r, g, b };
}

export default class LightRenderer {
  public layer: Container;
  private darkness: Graphics;

  // ambient color tween
  private ambient: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private ambientStart: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private ambientTarget: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private steps = 0;
  private counter = 0;

  // constants
  private readonly DARKNESS: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  // cache gradient textures by `${sizePx}_${colorByte}`
  private gradientCache = new Map<string, Texture>();

  constructor() {
    this.layer = new Container();
    this.darkness = new Graphics();
    this.layer.addChild(this.darkness);
    // All light bubble sprites we add each frame are removed at the end of frame.
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

  /**
   * Call once per frame *before* adding light bubbles.
   * width/height are the unscaled, base-game pixels: TILE_WIDTH * TILE_SIZE, etc.
   */
  public begin(width: number, height: number) {
    // tween ambient
    if (this.counter > 0) {
      this.ambient = lerpRGBA(this.ambientTarget, this.ambientStart, this.getInterpT());
      this.counter--;
    }

    // blend ambient toward full darkness by day/night fraction
    const night = this.getDarknessFraction();
    const ambientNight = lerpRGBA(this.ambient, this.DARKNESS, night);

    // redraw darkness quad
    this.darkness.clear();
    this.darkness.beginFill(0x000000, ambientNight.a / 255);
    // color component isn’t used by Graphics alpha fill; keep 0x000000 and set alpha from ambientNight.a
    this.darkness.drawRect(0, 0, width, height);
    this.darkness.endFill();

    // Set up ERASE compositing for subsequently added bubbles only.
    // We do this by putting bubbles as children *after* darkness and giving them blendMode 'erase'.
    // (Pixi v8 uses string blend modes.)
    // Nothing else to do here; just ensure the darkness stays as the first child.
    if (this.layer.children[0] !== this.darkness) {
      this.layer.removeChild(this.darkness);
      this.layer.addChildAt(this.darkness, 0);
    }
  }

  /**
   * Adds a radial light “bubble” in **game pixel space** (screen-space tiles * TILE_SIZE).
   * x/y are in **tile units** (centered on tile), size is in **tile units** as well (like old code).
   */
  public addLightBubble(tileX: number, tileY: number, sizeTiles: number, colorByte: number) {
    if (colorByte < 0 || colorByte >= 216) return;

    const px = tileX * Interface.TILE_SIZE + Interface.TILE_SIZE;
    const py = tileY * Interface.TILE_SIZE + Interface.TILE_SIZE;
    const radiusPx = sizeTiles * Interface.TILE_SIZE;

    const tex = this.getGradientTexture(radiusPx, colorByte);
    const spr = new Sprite(tex);
    spr.anchor.set(0.5);
    spr.x = px;
    spr.y = py;
    spr.blendMode = 'erase'; // punch a hole through darkness
    this.layer.addChild(spr);
  }

  /**
   * Remove all bubbles (children after index 0) so the layer is ready next frame.
   */
  public end() {
    if (this.layer.children.length > 1) {
      this.layer.removeChildren(1);
    }
  }

  private getGradientTexture(radiusPx: number, colorByte: number): Texture {
    const key = `${radiusPx|0}_${colorByte}`;
    const found = this.gradientCache.get(key);
    if (found) return found;

    const diameter = Math.max(2, (radiusPx * 2) | 0);
    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext('2d')!;

    const { r, g, b } = tibiaColorToRGB(colorByte);
    const centerX = radiusPx;
    const centerY = radiusPx;
    const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusPx);

    // emulate old quadratic falloff via step alphas
    // NOTE: we *ignore* day/night here; ambient darkness already accounts for it.
    const a1 = 1.0;
    const a2 = 0.5;
    const a3 = 0.25;
    const a4 = 0.125;

    grd.addColorStop(0.00, `rgba(${r},${g},${b},${a1})`);
    grd.addColorStop(0.25, `rgba(${r},${g},${b},${a2})`);
    grd.addColorStop(0.50, `rgba(${r},${g},${b},${a3})`);
    grd.addColorStop(0.75, `rgba(${r},${g},${b},${a4})`);
    grd.addColorStop(1.00, `rgba(0,0,0,0)`);

    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusPx, 0, Math.PI * 2);
    ctx.fill();

    const tex = Texture.from(canvas);
    this.gradientCache.set(key, tex);
    return tex;
  }
}

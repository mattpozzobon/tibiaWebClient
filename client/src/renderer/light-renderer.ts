// src/renderer/light-renderer.ts
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import Interface from '../ui/interface';

type RGBA = { r: number; g: number; b: number; a: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRGBA = (f: RGBA, t: RGBA, k: number): RGBA => ({
  r: lerp(f.r, t.r, k),
  g: lerp(f.g, t.g, k),
  b: lerp(f.b, t.b, k),
  a: lerp(f.a, t.a, k),
});

export default class LightRenderer {
  public layer: Container;

  private darkness: Graphics;   // full-screen black quad
  private holes: Container;     // light shapes used as an (inverse) alpha mask

  private ambient: RGBA       = { r: 0, g: 0, b: 0, a: 0 };
  private ambientStart: RGBA  = { r: 0, g: 0, b: 0, a: 0 };
  private ambientTarget: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private steps = 0;
  private counter = 0;

  private readonly DARKNESS: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  private alphaGradientCache = new Map<number, Texture>();

  constructor() {
    this.layer = new Container();

    // 1) Darkness graphics on screen
    this.darkness = new Graphics();
    this.layer.addChild(this.darkness);

    // 2) Container of white radial sprites that define the "holes"
    this.holes = new Container();
    this.layer.addChild(this.holes);

    // ⬅️ Key line: inverse mask = hide darkness where holes are drawn
    this.darkness.setMask({ mask: this.holes, inverse: true });
  }

  public setAmbientColor(r: number, g: number, b: number, a: number) {
    this.ambientTarget = { r, g, b, a };
    this.ambientStart = { ...this.ambient };
    const d1 = Math.abs(this.ambientStart.r - this.ambientTarget.r);
    const d2 = Math.abs(this.ambientStart.g - this.ambientTarget.g);
    const d3 = Math.abs(this.ambientStart.b - this.ambientTarget.b);
    const d4 = Math.abs(this.ambientStart.a - this.ambientTarget.a);
    this.steps = 2 * Math.max(d1, d2, d3, d4);
    this.counter = this.steps;
  }

  private getNightSine(): number {
    const unix = window.gameClient.world.clock.getUnix();
    return Math.sin(0.25 * Math.PI + (2 * Math.PI * unix) / (24 * 60 * 60 * 1000));
  }
  
  private getDarknessFraction(): number {
    let f = 0.9 * (this.getNightSine() + 1);
    if (window.gameClient.player!.isUnderground()) f = 1;
    return f;
  }
  private interpT(): number {
    return this.steps > 0 ? (this.counter - 1) / this.steps : 0;
  }

  /** Call once per frame before adding bubbles. */
  public begin(width: number, height: number) {
    if (this.counter > 0) {
      this.ambient = lerpRGBA(this.ambientTarget, this.ambientStart, this.interpT());
      this.counter--;
    }

    const night = this.getDarknessFraction();
    const ambientNight = lerpRGBA(this.ambient, this.DARKNESS, night);
    const alpha = ambientNight.a / 255;

    // draw the darkness (slightly oversized)
    this.darkness.clear();
    // v8 style draw:
    this.darkness.rect(-2, -2, width + 4, height + 4).fill({ color: 0x000000, alpha });

    // start with no holes; lights this frame will populate it
    this.holes.removeChildren();
  }

  /**
   * Add a light bubble that cuts through the darkness.
   * tileX/tileY are TILE coords; sizeTiles is radius in tiles.
   */
  public addLightBubble(tileX: number, tileY: number, sizeTiles: number, _colorByte: number) {
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const radiusPx = Math.max(1, sizeTiles * Interface.TILE_SIZE);

    const tex = this.getAlphaGradientTexture(radiusPx);
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    s.position.set(cx, cy);
    s.tint = 0xFFFFFF; // mask uses alpha (white = strong mask)
    s.alpha = 1.0;
    this.holes.addChild(s);
  }

  public end() { /* no-op */ }

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

    // white center -> transparent edge; alpha drives the mask strength
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

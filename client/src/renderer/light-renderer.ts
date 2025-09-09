// src/renderer/light-renderer.ts
import { Container, Graphics, Sprite, Texture, Renderer } from 'pixi.js';
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

  private darkness: Graphics;
  private holes: Container;            // container of gradient sprites used as mask
  private appRenderer?: Renderer;

  private ambient: RGBA       = { r: 0, g: 0, b: 0, a: 0 };
  private ambientStart: RGBA  = { r: 0, g: 0, b: 0, a: 0 };
  private ambientTarget: RGBA = { r: 0, g: 0, b: 0, a: 0 };
  private steps = 0;
  private counter = 0;

  private readonly DARKNESS: RGBA = { r: 0, g: 0, b: 0, a: 255 };

  constructor(renderer?: Renderer) {
    this.layer = new Container();

    this.darkness = new Graphics();
    this.layer.addChild(this.darkness);

    // Container for light holes - will be used as mask
    this.holes = new Container();
    this.layer.addChild(this.holes);

    // Use holes container as inverse mask for darkness
    this.darkness.setMask({ mask: this.holes, inverse: true });

    if (renderer) this.setRenderer(renderer);
  }

  public setRenderer(renderer: Renderer) {
    this.appRenderer = renderer;
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

    // Draw the darkness quad
    this.darkness.clear();
    this.darkness.rect(-2, -2, width + 4, height + 4).fill({ color: 0x000000, alpha });

    // Clear holes for this frame
    this.holes.removeChildren();
  }

  /** Add feathered "hole". */
  public addLightBubble(tileX: number, tileY: number, sizeTiles: number, _colorByte: number) {
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const radiusPx = Math.max(1, sizeTiles * Interface.TILE_SIZE);

    // Create a circular graphics shape for the mask
    const circle = new Graphics();
    circle.circle(0, 0, radiusPx);
    circle.fill({ color: 0xFFFFFF, alpha: 1.0 });
    circle.position.set(cx, cy);
    this.holes.addChild(circle);
  }

  /** After adding all bubbles this frame. */
  public end() {
    // No-op - we'll use a different approach that doesn't interfere with the render loop
  }

}

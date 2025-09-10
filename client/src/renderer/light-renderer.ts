// src/renderer/light-renderer.ts
import {
  BLEND_MODES,
  BlurFilter,
  Container,
  Graphics,
  RenderTexture,
  Renderer,
  Sprite,
  Texture,
} from 'pixi.js';
import Interface from '../ui/interface';

export default class LightRenderer {
  public readonly layer: Container;

  // Offscreen composition: darkness + ERASE sprites
  private darkStage: Container;
  private darkness: Sprite;          // black fullscreen quad in darkStage
  private holesLayer: Container;     // holds ERASE sprites in darkStage

  private rt!: RenderTexture;        // output of darkStage
  private rtSprite!: Sprite;         // drawn over the game

  // Pre-baked eraser texture (circle). We create it once.
  private holeTex!: Texture;

  // Optional blur (applied ONCE to the baked hole texture if soft edges requested)
  private softnessPx = 0; // 0 = hard edge; >0 = soft edge baked once

  // Pools to avoid GC churn
  private pool: Sprite[] = [];
  private used = 0;

  // Settings
  private ambient = 0.8;
  private rtW = 0;
  private rtH = 0;

  constructor(private renderer: Renderer) {
    this.layer = new Container();

    // Offscreen scene to compose the darkness
    this.darkStage = new Container();

    // 1) Black overlay (what we’ll be erasing from)
    this.darkness = new Sprite(Texture.WHITE);
    this.darkness.tint = 0x000000;
    this.darkness.alpha = this.ambient;
    this.darkStage.addChild(this.darkness);

    // 2) Container for ERASE sprites
    this.holesLayer = new Container();
    this.darkStage.addChild(this.holesLayer);

    // 3) Output RT + on-screen sprite
    this.rt = RenderTexture.create({ width: 2, height: 2 });
    this.rtSprite = new Sprite(this.rt);
    this.layer.addChild(this.rtSprite);

    // 4) Build the eraser texture once (hard edge by default)
    this.rebuildHoleTexture();
  }

  /** Build (or rebuild) the eraser texture. Call again if you change softness. */
  private rebuildHoleTexture() {
    const baseSize = 512; // 256–1024; bigger = smoother edge when scaled
    const g = new Graphics();
  
    // draw solid white circle on transparent background
    g.clear();
    g.circle(baseSize / 2, baseSize / 2, baseSize / 2).fill(0xffffff);
  
    if (this.softnessPx > 0) {
      const blur = new BlurFilter({
        strength: this.softnessPx,
        quality: 3,
      });
      blur.padding = Math.max(32, this.softnessPx * 2);
      g.filters = [blur];
    } else {
      g.filters = null;
    }
  
    // Build an RT to hold the baked circle (hi-res for nice edges)
    const holeRT = RenderTexture.create({
      width: baseSize,
      height: baseSize,
      resolution: 2, // bump to 3 if you still see jaggies
    });
  
    // Render the Graphics into the RT (v8 render signature)
    this.renderer.render({ container: g, target: holeRT, clear: true });
  
    // Use the RT as our reusable texture
    this.holeTex = holeRT as unknown as Texture; // Sprite accepts it fine
  
    g.destroy(true);
  }

  /** Ensure the offscreen RT matches our base (unscaled) game size. */
  private ensureRT(width: number, height: number) {
    if (width === this.rtW && height === this.rtH) return;

    this.rtW = width;
    this.rtH = height;

    this.rt.destroy(true);
    this.rt = RenderTexture.create({ width, height });

    // Resize darkness quad and output sprite
    this.darkness.position.set(0, 0);
    this.darkness.width = width;
    this.darkness.height = height;

    this.rtSprite.texture = this.rt;
    this.rtSprite.position.set(0, 0);
    this.rtSprite.width = width;
    this.rtSprite.height = height;
  }

  /** Call at the start of your world render with base (unscaled) size. */
  public begin(width: number, height: number, ambientAlpha = 0.8) {
    this.ensureRT(width, height);

    // Update darkness intensity
    this.darkness.alpha = this.ambient = ambientAlpha;

    // Reset pool usage
    this.used = 0;
    for (let i = 0; i < this.pool.length; i++) this.pool[i].visible = false;
  }

  public addLightBubble(tileX: number, tileY: number, size: number, _colorByte: number) {
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const r  = Math.max(1, size * Interface.TILE_SIZE);
  
    let s = this.pool[this.used];
    if (!s) {
      s = new Sprite(this.holeTex);
      s.anchor.set(0.5);
      s.blendMode = 'erase'; // requires: import 'pixi.js/advanced-blend-modes'
      this.pool.push(s);
      this.holesLayer.addChild(s);
    } else {
      s.texture = this.holeTex; // in case softness changed and we rebuilt
    }
  
    s.visible = true;
    s.position.set(cx, cy);
  
    const texRadius = this.holeTex.width / 2;
    const blurComp = this.softnessPx > 0 ? 1.0 - (this.softnessPx / (texRadius * 1.5)) : 1.0;
    const scale = (r / texRadius) * blurComp;
    s.scale.set(scale);
  
    this.used++;
  }

  /** Compose darkness + holes into the RT; the RT sprite is already on stage. */
  public end() {
    this.renderer.render({
      container: this.darkStage,
      target: this.rt,
      clear: true,
    });
  }

  /** 0..1 how dark the world is where there’s no light. */
  public setAmbient(alpha: number) {
    this.ambient = Math.min(1, Math.max(0, alpha));
    this.darkness.alpha = this.ambient;
  }

  /**
   * Soft edges without per-frame cost.
   * We rebuild the eraser texture ONCE with a blur, then reuse it every frame.
   */
  public setSoftness(px: number) {
    const v = Math.max(0, Math.floor(px));
    if (v === this.softnessPx) return;
    this.softnessPx = v;
    this.rebuildHoleTexture();
  }
}

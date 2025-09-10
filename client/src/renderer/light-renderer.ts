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

// --- Helpers to mirror your Canvas version ---
function getNightSine(): number {
  const unix = window.gameClient.world.clock.getUnix();
  return Math.sin(0.25 * Math.PI + (2 * Math.PI * unix) / (24 * 60 * 60 * 1000));
}
function getDarknessFraction(): number {
  let fraction = 0.5 * (getNightSine() + 1);
  if (window.gameClient.player!.isUnderground()) fraction = 1;
  return fraction; // 0..1
}
// Tibia-style 6×6×6 palette (0..215), or allow 0xRRGGBB
function decodeLightColor(colorByte: number): number {
  if (colorByte > 0xFFFFFF) colorByte &= 0xFFFFFF;
  if (colorByte > 0xFF) return colorByte;
  const r = 51 * (Math.floor(colorByte / 36) % 6);
  const g = 51 * (Math.floor(colorByte / 6) % 6);
  const b = 51 * (colorByte % 6);
  return (r << 16) | (g << 8) | b;
}

export default class LightRenderer {
  public readonly layer: Container;

  // Offscreen composition: darkness + ERASE sprites
  private darkStage: Container;
  private darkness: Sprite;
  private holesLayer: Container;

  private rt!: RenderTexture;
  private rtSprite!: Sprite;

  // Pre-baked radial alpha gradient (white → transparent)
  private holeTex!: Texture;

  // NEW: On-screen additive glow layer using same gradient, tinted
  private glowLayer: Container;
  private glowPool: Sprite[] = [];
  private glowUsed = 0;

  // Pools (erase sprites)
  private pool: Sprite[] = [];
  private used = 0;

  // Controls
  private ambient = 0.8;
  private rtW = 0;
  private rtH = 0;

  // Bake quality / shaping
  private baseSize = 512;        // gradient diameter (px) before scaling
  private bakeResolution = 2;    // 1..3
  private softnessPx = 8;        // one-time blur to smooth/defuzz gradient
  private falloffPower = 1.6;    // >1 = slower fade near center

  // Glow tuning
  private glowScale = 1.0;       // scale vs. erase radius (1.0 = same; try 1.1 for a slight halo)
  private glowMaxAlpha = 1.0;    // cap for glow alpha

  constructor(private renderer: Renderer) {
    this.layer = new Container();

    // Offscreen darkness compositor
    this.darkStage = new Container();

    this.darkness = new Sprite(Texture.WHITE);
    this.darkness.tint = 0x000000;
    this.darkness.alpha = this.ambient;
    this.darkStage.addChild(this.darkness);

    this.holesLayer = new Container();
    this.darkStage.addChild(this.holesLayer);

    this.rt = RenderTexture.create({ width: 2, height: 2 });
    this.rtSprite = new Sprite(this.rt);
    this.layer.addChild(this.rtSprite);

    // NEW: glow goes ABOVE the darkness overlay so it’s visible even in dark areas
    this.glowLayer = new Container();
    this.layer.addChild(this.glowLayer);

    // Build gradient once
    this.rebuildHoleTexture();
  }

  /** Build (or rebuild) the radial gradient texture: center alpha=1 → edge 0. */
  private rebuildHoleTexture() {
    const size = this.baseSize * this.bakeResolution;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2, cy = size / 2, r = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);

    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;                     // 0..1 from center to edge
      const alpha = Math.pow(1 - t, this.falloffPower); // 1→0 curve
      grad.addColorStop(t, `rgba(255,255,255,${alpha.toFixed(4)})`);
    }

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const gradientTex = Texture.from(canvas);

    // Optional one-time blur to remove banding
    const holder = new Sprite(gradientTex);
    holder.width = this.baseSize;
    holder.height = this.baseSize;

    if (this.softnessPx > 0) {
      const blur = new BlurFilter({ strength: this.softnessPx, quality: 3 });
      blur.padding = Math.max(32, this.softnessPx * 2);
      holder.filters = [blur];
    } else {
      holder.filters = null;
    }

    const baked = RenderTexture.create({
      width: this.baseSize,
      height: this.baseSize,
      resolution: this.bakeResolution,
    });
    this.renderer.render({ container: holder, target: baked, clear: true });

    this.holeTex?.destroy(true);
    this.holeTex = baked as unknown as Texture;

    gradientTex.destroy(true);
    holder.destroy(true);
  }

  private ensureRT(width: number, height: number) {
    if (width === this.rtW && height === this.rtH) return;

    this.rtW = width;
    this.rtH = height;

    this.rt.destroy(true);
    this.rt = RenderTexture.create({ width, height });

    this.darkness.position.set(0, 0);
    this.darkness.width = width;
    this.darkness.height = height;

    this.rtSprite.texture = this.rt;
    this.rtSprite.position.set(0, 0);
    this.rtSprite.width = width;
    this.rtSprite.height = height;
  }

  /** Call at start of world render with base (unscaled) size. */
  public begin(width: number, height: number, ambientAlpha = 0.8) {
    this.ensureRT(width, height);

    this.darkness.alpha = this.ambient = ambientAlpha;

    // Reset pools
    this.used = 0;
    for (let i = 0; i < this.pool.length; i++) this.pool[i].visible = false;

    this.glowUsed = 0;
    for (let i = 0; i < this.glowPool.length; i++) this.glowPool[i].visible = false;
  }

  public addLightBubble(tileX: number, tileY: number, size: number, colorByte: number) {
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const r  = Math.max(1, size * Interface.TILE_SIZE);

    // ERASE sprite (removes darkness alpha with smooth falloff)
    let e = this.pool[this.used];
    if (!e) {
      e = new Sprite(this.holeTex);
      e.anchor.set(0.5);
      e.blendMode = 'erase'; // requires: import 'pixi.js/advanced-blend-modes'
      this.pool.push(e);
      this.holesLayer.addChild(e);
    } else {
      e.texture = this.holeTex;
    }
    e.visible = true;
    e.position.set(cx, cy);
    const texRadius = this.baseSize / 2;
    const scale = r / texRadius;
    e.scale.set(scale);

    this.used++;

    // ADDITIVE GLOW sprite (same gradient, tinted by item color)
    const tint = decodeLightColor(colorByte);
    let g = this.glowPool[this.glowUsed];
    if (!g) {
      g = new Sprite(this.holeTex);
      g.anchor.set(0.5);
      g.blendMode = 'add';
      this.glowPool.push(g);
      this.glowLayer.addChild(g);
    } else {
      g.texture = this.holeTex;
    }
    g.visible = true;
    g.position.set(cx, cy);
    g.scale.set(scale * this.glowScale);
    g.tint = tint;

    // Night-based intensity (similar to your Canvas code)
    const night = getDarknessFraction(); // 0..1
    const intensity = 0.5 * night;       // 0 at day, 0.5 at full night
    g.alpha = Math.min(this.glowMaxAlpha, intensity);

    this.glowUsed++;
  }

  /** Compose darkness + holes into the RT; the RT sprite is already on stage. */
  public end() {
    this.renderer.render({
      container: this.darkStage,
      target: this.rt,
      clear: true,
    });
  }
}

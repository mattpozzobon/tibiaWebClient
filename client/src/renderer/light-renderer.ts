// src/renderer/light-renderer.ts
import {
  BlurFilter,
  Container,
  Graphics,
  RenderTexture,
  Renderer,
  Sprite,
  Texture,
} from 'pixi.js';
import Interface from '../ui/interface';

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

  private darkStage: Container;
  private darkness: Sprite;
  private holesLayer: Container;

  private rt!: RenderTexture;
  private rtSprite!: Sprite;

  private holeTex!: Texture;

  private glowLayer: Container;
  private glowPool: Sprite[] = [];
  private glowUsed = 0;

  private pool: Sprite[] = [];
  private used = 0;

  private ambient = 0.8;
  private rtW = 0;
  private rtH = 0;

  private baseSize = 512;
  private bakeResolution = 2;
  private softnessPx = 8;
  private falloffPower = 1.6;

  private glowScale = 1.0;
  private glowMaxAlpha = 1.0;

  constructor(private renderer: Renderer) {
    this.layer = new Container();

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

    this.glowLayer = new Container();
    this.layer.addChild(this.glowLayer);

    this.rebuildHoleTexture();
  }

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
      const t = i / steps;
      const alpha = Math.pow(1 - t, this.falloffPower);
      grad.addColorStop(t, `rgba(255,255,255,${alpha.toFixed(4)})`);
    }

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const gradientTex = Texture.from(canvas);

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

  private computeAmbient(): number {
    const t = window.gameClient.world.clock.getUnix();
    const minutes = Math.floor(t / 60000) % (24 * 60);
    const isCave = window.gameClient.player!.isUnderground();

    const isNight = minutes >= 22 * 60 || minutes < 4 * 60;
    if (isCave || isNight) return 1;

    const sunriseStart = 4 * 60, sunriseEnd = 6 * 60;
    const sunsetStart = 18 * 60, sunsetEnd = 22 * 60;

    if (minutes < sunriseStart) return 1;
    if (minutes < sunriseEnd) {
      const t01 = (minutes - sunriseStart) / (sunriseEnd - sunriseStart);
      return 1 - t01;
    }
    if (minutes < sunsetStart) return 0;
    if (minutes < sunsetEnd) {
      const t01 = (minutes - sunsetStart) / (sunsetEnd - sunsetStart);
      return t01;
    }
    return 1;
  }

  public begin() {
    const width  = Interface.TILE_WIDTH  * Interface.TILE_SIZE;
    const height = Interface.TILE_HEIGHT * Interface.TILE_SIZE;
    this.ensureRT(width, height);
    const a = this.computeAmbient();
    console.log('ambient', a);
    this.darkness.alpha = this.ambient = a;

    this.used = 0;
    for (let i = 0; i < this.pool.length; i++) this.pool[i].visible = false;

    this.glowUsed = 0;
    for (let i = 0; i < this.glowPool.length; i++) this.glowPool[i].visible = false;
  }

  public addLightBubble(tileX: number, tileY: number, size: number, colorByte: number) {
    
    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const r  = Math.max(1, size * Interface.TILE_SIZE);

    let e = this.pool[this.used];
    if (!e) {
      e = new Sprite(this.holeTex);
      e.anchor.set(0.5);
      e.blendMode = 'erase';
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

    const intensity = Math.min(this.glowMaxAlpha, 0.75 * this.ambient);
    g.alpha = intensity;

    this.glowUsed++;
  }

  public end() {
    this.renderer.render({
      container: this.darkStage,
      target: this.rt,
      clear: true,
    });
  }

  public setSoftness(px: number) {
    const v = Math.max(0, Math.floor(px));
    if (v === this.softnessPx) return;
    this.softnessPx = v;
    this.rebuildHoleTexture();
  }

  public setFalloff(power: number) {
    const p = Math.max(0.1, Math.min(5, power));
    if (p === this.falloffPower) return;
    this.falloffPower = p;
    this.rebuildHoleTexture();
  }

  public setBakeQuality(opts: { size?: number; resolution?: number }) {
    if (opts.size) this.baseSize = Math.max(128, Math.min(2048, Math.floor(opts.size)));
    if (opts.resolution) this.bakeResolution = Math.max(1, Math.min(4, Math.floor(opts.resolution)));
    this.rebuildHoleTexture();
  }

  public setGlowStyle(opts: { scale?: number; maxAlpha?: number }) {
    if (opts.scale !== undefined) this.glowScale = Math.max(0.5, Math.min(2.0, opts.scale));
    if (opts.maxAlpha !== undefined) this.glowMaxAlpha = Math.max(0, Math.min(1, opts.maxAlpha));
  }
}

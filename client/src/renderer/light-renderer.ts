// src/renderer/light-renderer.ts
import {
  BlurFilter,
  Container,
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

type FloorGlow = {
  stage: Container;     // glow sprites for that floor
  pool: Sprite[];
  used: number;
  rt: RenderTexture;    // baked carved glow (after occluders)
  spr: Sprite;          // sprite for displaying carved glow
  holeSpr: Sprite;      // sprite to ERASE into darkness pass
};

type FloorOcclusion = {
  stage: Container;     // exact-shape occluder sprites for this floor
  pool: Sprite[];
  used: number;
};

export default class LightRenderer {
  public readonly layer: Container;

  // Darkness pipeline
  private darkStage: Container;
  private darkness: Sprite;
  private holesLayer: Container;  // all 'erase' sprites (current + lower floors)

  private rt!: RenderTexture;     // main darkness RT shown on screen
  private rtSprite!: Sprite;

  // Glows drawn above darkness
  private lowerGlowLayer: Container;
  private glowLayer: Container;

  // Current-floor erase bubbles + visible glow bubbles
  private holeTex!: Texture;
  private pool: Sprite[] = [];
  private used = 0;

  private glowPool: Sprite[] = [];
  private glowUsed = 0;

  // Screen size cache
  private rtW = 0;
  private rtH = 0;

  // Bubble bake params
  private baseSize = 512;
  private bakeResolution = 2;
  private softnessPx = 8;
  private falloffPower = 1.6;

  // Glow style (tuned to be dimmer + non-accumulating)
  private glowScale: number = 1.0;
  private glowMaxAlpha: number = 0.2;                        // ↓ was 0.6
  private glowBlend: 'lighten' = 'lighten'; // 'lighten' avoids stacking

  // Overlap (current floor only) — stronger damping to reduce stacking
  private gridW = 0;
  private gridH = 0;
  private overlapGrid: Uint16Array | null = null;
  private overlapK = 10.0; // ↑ was 1.0 (higher => additional lights contribute less)

  // Floors
  private currentZ = 0;
  private lastVisibleZ = 0;

  // Ambient (day/night/cave)
  private ambient = 1.0;

  // Per-floor collections
  private glowByZ = new Map<number, FloorGlow>();
  private occByZ = new Map<number, FloorOcclusion>();

  // Light-leak mitigation knobs (OFF by default to avoid seams)
  private eraseInflatePx = 0;
  private eraseBlurStrength = 0;
  private snapPixelPositions = false;

  constructor(private renderer: Renderer) {
    this.layer = new Container();

    // darkness graph
    this.darkStage = new Container();

    this.darkness = new Sprite(Texture.WHITE);
    this.darkness.tint = 0x000000;
    this.darkness.alpha = 1.0;
    this.darkStage.addChild(this.darkness);

    this.holesLayer = new Container(); // children must set blendMode='erase'
    this.darkStage.addChild(this.holesLayer);

    // main RT and on-screen sprite
    this.rt = RenderTexture.create({ width: 2, height: 2 });
    this.rtSprite = new Sprite(this.rt);
    this.layer.addChild(this.rtSprite);

    // layers drawn above darkness
    this.lowerGlowLayer = new Container();
    this.layer.addChild(this.lowerGlowLayer);

    this.glowLayer = new Container();
    this.layer.addChild(this.glowLayer);

    this.rebuildHoleTexture();
  }

  // ---------- Frame lifecycle ----------

  public beginFrame(currentZ: number, lastVisibleZ: number) {
    this.currentZ = currentZ;
    this.lastVisibleZ = lastVisibleZ;

    const width  = Interface.TILE_WIDTH  * Interface.TILE_SIZE;
    const height = Interface.TILE_HEIGHT * Interface.TILE_SIZE;
    this.ensureRTs(width, height);

    // update ambient and set darkness alpha
    this.ambient = this.computeAmbient();
    this.darkness.alpha = Math.min(1, this.ambient * 1.15);

    // reset darkness holes
    for (let i = 0; i < this.pool.length; i++) this.pool[i].visible = false;
    this.used = 0;

    // current-floor glow reuse
    for (let i = 0; i < this.glowPool.length; i++) this.glowPool[i].visible = false;
    this.glowUsed = 0;

    // clear drawn layers
    this.lowerGlowLayer.removeChildren();

    // reset per-floor pools
    for (const fg of this.glowByZ.values()) {
      fg.used = 0;
      for (const s of fg.pool) s.visible = false;
      fg.spr.visible = false;
      fg.holeSpr.visible = false;
      this.ensureGlowRT(fg, width, height);
    }
    for (const oc of this.occByZ.values()) {
      oc.used = 0;
      for (const s of oc.pool) s.visible = false;
    }

    // overlap grid (current floor)
    const gw = Interface.TILE_WIDTH | 0;
    const gh = Interface.TILE_HEIGHT | 0;
    if (!this.overlapGrid || gw !== this.gridW || gh !== this.gridH) {
      this.gridW = gw; this.gridH = gh;
      this.overlapGrid = new Uint16Array(gw * gh);
    } else {
      this.overlapGrid.fill(0);
    }
  }

  public endFrame() {
    // bake carved glows for lower floors and schedule their hole sprites
    for (const [zLower, fg] of this.glowByZ) {
      if (zLower >= this.currentZ) continue;
      if (fg.used === 0) continue;

      // detect if any occluders exist above this floor
      let hasAbove = false;
      for (let z = zLower + 1; z <= this.lastVisibleZ; z++) {
        const oc = this.occByZ.get(z);
        if (oc && oc.used) { hasAbove = true; break; }
      }

      // render that floor's glow
      this.renderer.render({
        container: fg.stage,
        target: fg.rt,
        clear: true,
      });

      // carve with occluders from floors above it (zLower, lastVisibleZ]
      if (hasAbove) {
        const blur = (this.eraseBlurStrength > 0)
          ? new BlurFilter({ strength: this.eraseBlurStrength, quality: 1 })
          : null;

        for (let z = zLower + 1; z <= this.lastVisibleZ; z++) {
          const oc = this.occByZ.get(z);
          if (!oc || oc.used === 0) continue;

          const originals: (string | number)[] = new Array(oc.stage.children.length);
          const origX: number[] = new Array(oc.stage.children.length);
          const origY: number[] = new Array(oc.stage.children.length);
          const origW: number[] = new Array(oc.stage.children.length);
          const origH: number[] = new Array(oc.stage.children.length);

          if (blur) oc.stage.filters = [blur];

          for (let i = 0; i < oc.stage.children.length; i++) {
            const s = oc.stage.children[i] as Sprite;
            originals[i] = s.blendMode;
            origX[i] = s.x; origY[i] = s.y; origW[i] = s.width; origH[i] = s.height;

            s.blendMode = 'erase';

            // optional inflate to avoid leaks — OFF by default
            if (this.eraseInflatePx > 0) {
              s.x = origX[i] - this.eraseInflatePx;
              s.y = origY[i] - this.eraseInflatePx;
              s.width  = origW[i] + this.eraseInflatePx * 2;
              s.height = origH[i] + this.eraseInflatePx * 2;
            }

            if (this.snapPixelPositions) {
              s.x = Math.round(s.x);
              s.y = Math.round(s.y);
            }
          }

          this.renderer.render({
            container: oc.stage,
            target: fg.rt,
            clear: false,
          });

          // restore
          for (let i = 0; i < oc.stage.children.length; i++) {
            const s = oc.stage.children[i] as Sprite;
            s.blendMode = originals[i] as any;
            s.x = origX[i]; s.y = origY[i]; s.width = origW[i]; s.height = origH[i];
          }
          if (blur) oc.stage.filters = null;
        }
      }

      // queue a hole sprite (blendMode='erase') inside holesLayer
      fg.holeSpr.texture = fg.rt;
      fg.holeSpr.blendMode = 'erase';
      fg.holeSpr.alpha = 1.0;
      fg.holeSpr.visible = true;
      if (!fg.holeSpr.parent) this.holesLayer.addChild(fg.holeSpr);
    }

    // single pass: build darkness + all holes (current + lower floors)
    this.renderer.render({
      container: this.darkStage,
      target: this.rt,
      clear: true,
    });

    // draw carved lower-floor glows above darkness for colored halos (scaled by ambient too)
    const ambientScale = 0.4 * this.ambient; // ↓ was 0.5
    for (const [zLower, fg] of this.glowByZ) {
      if (zLower >= this.currentZ) continue;
      if (fg.used === 0) continue;

      fg.spr.texture = fg.rt;
      fg.spr.blendMode = this.glowBlend; // 'lighten' by default to avoid stacking
      fg.spr.alpha = this.depthAlphaFor(zLower) * ambientScale;
      fg.spr.visible = true;
      if (!fg.spr.parent) this.lowerGlowLayer.addChild(fg.spr);
    }
  }

  // Back-compat wrappers
  public begin() {
    const playerZ = window.gameClient.player!.getPosition().z;
    this.beginFrame(playerZ, playerZ);
  }
  public end() { this.endFrame(); }

  // ---------- Public API ----------

  public addLightBubble(tileX: number, tileY: number, size: number, colorByte: number, z?: number) {
    const floorZ = z ?? this.currentZ;

    const cx = (tileX + 0.5) * Interface.TILE_SIZE;
    const cy = (tileY + 0.5) * Interface.TILE_SIZE;
    const r  = Math.max(1, size * Interface.TILE_SIZE);
    const texRadius = this.baseSize / 2;

    if (floorZ === this.currentZ) {
      // Erase hole on darkness (current floor)
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
      e.position.set(this.snap(cx), this.snap(cy));
      e.scale.set(r / texRadius);
      this.used++;

      // Visible glow on current floor
      const tint = decodeLightColor(colorByte);
      let g = this.glowPool[this.glowUsed];
      if (!g) {
        g = new Sprite(this.holeTex);
        g.anchor.set(0.5);
        g.blendMode = this.glowBlend; // 'lighten' to avoid stacking
        this.glowPool.push(g);
        this.glowLayer.addChild(g);
      } else {
        g.texture = this.holeTex;
        g.blendMode = this.glowBlend;
      }
      g.visible = true;
      g.position.set(this.snap(cx), this.snap(cy));
      g.scale.set((r / texRadius) * this.glowScale);
      g.tint = tint;

      // Overlap attenuation (current floor)
      const gx = Math.max(0, Math.min(this.gridW - 1, Math.floor(tileX + 0.5)));
      const gy = Math.max(0, Math.min(this.gridH - 1, Math.floor(tileY + 0.5)));
      const idx = gy * this.gridW + gx;
      const prev = this.overlapGrid ? this.overlapGrid[idx] : 0;
      if (this.overlapGrid) this.overlapGrid[idx] = prev + 1;

      const atten = 1 / (1 + this.overlapK * prev);
      const r8 = (tint >> 16) & 0xff, g8 = (tint >> 8) & 0xff, b8 = tint & 0xff;
      const lum = 0.2126 * r8 + 0.7152 * g8 + 0.0722 * b8;
      const lumScale = 0.5 + 0.5 * (1 - lum / 255);

      const base = Math.min(this.glowMaxAlpha, 0.4 * this.ambient); // ↓ was 0.5
      g.alpha = base * lumScale * atten;

      this.glowUsed++;
      return;
    }

    // Lower floor: collect glow sprite (alpha scaled by ambient and depth)
    const fg = this.getFloorGlow(floorZ);
    let s = fg.pool[fg.used];
    if (!s) {
      s = new Sprite(this.holeTex);
      s.anchor.set(0.5);
      s.blendMode = this.glowBlend; // 'lighten'
      fg.pool.push(s);
      fg.stage.addChild(s);
    } else {
      s.texture = this.holeTex;
      s.blendMode = this.glowBlend;
    }
    s.visible = true;
    s.position.set(this.snap(cx), this.snap(cy));
    s.scale.set((r / texRadius) * this.glowScale);
    s.tint = decodeLightColor(colorByte);

    const ambientScale = 0.4 * this.ambient; // ↓ was 0.5
    s.alpha = Math.min(this.glowMaxAlpha, 0.55) * this.depthAlphaFor(floorZ) * ambientScale;

    fg.used++;
  }

  /** Register exact-shape tile/item sprite drawn on floor `z` as occluder. */
  public addOccluderSprite(z: number, texture: Texture, x: number, y: number, w: number, h: number) {
    const oc = this.getFloorOcclusion(z);
    let s = oc.pool[oc.used];
    if (!s) {
      s = new Sprite(texture);
      s.tint = 0x000000;      // color ignored during 'erase'; alpha matters
      s.alpha = 1.0;
      s.blendMode = 'normal';
      oc.pool.push(s);
      oc.stage.addChild(s);
    } else {
      s.texture = texture;
      s.blendMode = 'normal';
    }
    s.visible = true;
    s.x = this.snap(x);
    s.y = this.snap(y);
    s.width = w;
    s.height = h;
    oc.used++;
  }

  // ---------- Internals ----------

  private ensureRTs(width: number, height: number) {
    if (width === this.rtW && height === this.rtH) return;
    this.rtW = width;
    this.rtH = height;

    // main darkness RT
    this.rt.destroy(true);
    this.rt = RenderTexture.create({ width, height });
    this.rtSprite.texture = this.rt;
    this.rtSprite.position.set(0, 0);
    this.rtSprite.width = width;
    this.rtSprite.height = height;

    // darkness quad
    this.darkness.position.set(0, 0);
    this.darkness.width = width;
    this.darkness.height = height;

    // resize all floor glow RTs
    for (const fg of this.glowByZ.values()) this.ensureGlowRT(fg, width, height);
  }

  private ensureGlowRT(fg: FloorGlow, width: number, height: number) {
    fg.rt.destroy(true);
    fg.rt = RenderTexture.create({ width, height });
    fg.spr.texture = fg.rt;
    fg.spr.position.set(0, 0);
    fg.spr.width = width;
    fg.spr.height = height;

    fg.holeSpr.texture = fg.rt;
    fg.holeSpr.position.set(0, 0);
    fg.holeSpr.width = width;
    fg.holeSpr.height = height;
  }

  private getFloorGlow(z: number): FloorGlow {
    let fg = this.glowByZ.get(z);
    if (fg) return fg;
    const stage = new Container();
    const rt = RenderTexture.create({ width: Math.max(1, this.rtW), height: Math.max(1, this.rtH) });
    const spr = new Sprite(rt);     // for display above darkness
    spr.visible = false;

    const holeSpr = new Sprite(rt); // for ERASE inside darkness pass
    holeSpr.visible = false;
    holeSpr.blendMode = 'erase';

    fg = { stage, pool: [], used: 0, rt, spr, holeSpr };
    this.glowByZ.set(z, fg);
    return fg;
  }

  private getFloorOcclusion(z: number): FloorOcclusion {
    let oc = this.occByZ.get(z);
    if (oc) return oc;
    const stage = new Container();
    oc = { stage, pool: [], used: 0 };
    this.occByZ.set(z, oc);
    return oc;
  }

  private depthAlphaFor(zLower: number): number {
    const d = Math.max(0, this.currentZ - zLower);
    // slightly stronger first layer, faster falloff
    return Math.max(0.12, 0.7 * Math.pow(0.7, d - 1));
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
    this.holeTex = (baked as unknown) as Texture;

    gradientTex.destroy(true);
    holder.destroy(true);
  }

  // Ambient day/night like before
  private computeAmbient(): number {
    const t = window.gameClient.world.clock.getUnix();
    const minutes = Math.floor(t / 60000) % (24 * 60);
    const isCave = window.gameClient.player!.isUnderground();

    const isNight = minutes >= 22 * 60 || minutes < 4 * 60;
    if (isCave || isNight) return 1;

    const sunriseStart = 4 * 60, sunriseEnd = 6 * 60;
    const sunsetStart = 18 * 60, sunsetEnd = 22 * 60;

    const smooth = (v:number)=> v * v * (3 - 2 * v);

    if (minutes < sunriseStart) return 1;
    if (minutes < sunriseEnd) {
      const t01 = (minutes - sunriseStart) / (sunriseEnd - sunriseStart);
      return 1 - smooth(t01);
    }
    if (minutes < sunsetStart) return 0;
    if (minutes < sunsetEnd) {
      const t01 = (minutes - sunsetStart) / (sunsetEnd - sunsetStart);
      return smooth(t01);
    }
    return 1;
  }

  private snap(v: number): number {
    return this.snapPixelPositions ? Math.round(v) : v;
  }
}

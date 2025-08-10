import { Application, Container, Sprite, Texture, Point, Filter, BLEND_MODES } from 'pixi.js';
import Debugger from "../utils/debugger";
import Interface from "../ui/interface";
import Position from "../game/position";
import Creature from "../game/creature";
import TileRenderer from './tile-renderer';
import ItemRenderer from './item-renderer';
import CreatureRenderer from './creature-renderer';
import AnimationRenderer from './animation-renderer';
import BMFontLoader from './font';
import Tile from '../game/tile';
import { OutlineFilter } from 'pixi-filters';
import SpriteBatcher from './sprite-batcher';

export type DimStyle = { tint?: number; alpha?: number; blendMode?: string };

export default class Renderer {
  __nMiliseconds: number;
  private lastTestAnimationTime: number = 0;
  private readonly TEST_ANIMATION_INTERVAL: number = 1000;

  public debugger: Debugger;
  private __start: number;

  // legacy counters (kept for compatibility; no longer used for averages)
  public totalDrawTime: number = 0;

  public drawCalls: number = 0;
  public batchCount: number = 0;
  public textureSwitches: number = 0;

  // CPU timing (assemble/batching vs pixi render)
  private _cpuRenderStart = 0;
  public cpuAssembleMs = 0;   // last frame
  public totalAssembleMs = 0; // accum over UPDATE_INTERVAL
  public cpuRenderMs   = 0;   // last frame
  public totalRenderMs = 0;   // accum over UPDATE_INTERVAL

  public prerender = () => { this._cpuRenderStart = performance.now(); };
  public postrender = () => {
    this.cpuRenderMs = performance.now() - this._cpuRenderStart;
    this.totalRenderMs += this.cpuRenderMs;
  };

  public hoverOutline: Filter;
  public app: Application;
  public tileRenderer: TileRenderer;
  public itemRenderer: ItemRenderer;
  public scalingContainer: Container;
  public creatureRenderer: CreatureRenderer;
  public animationRenderer: AnimationRenderer;
  public overlayLayer: Container;
  public gameLayer: Container;

  public spritePool: Sprite[] = [];
  public readonly poolSize = 28 * 14 * 50;
  public poolIndex: number = 0;

  private batcher = new SpriteBatcher();
  private scratchRemovals: any[] = [];
  private lastFramePoolUsed = 0;

  constructor(app: Application) {
    this.app = app;
    this.debugger = new Debugger();
    this.scalingContainer = new Container();
    this.overlayLayer = new Container();
    this.gameLayer = new Container();
    this.hoverOutline = new OutlineFilter(2, 0xFFFFFF);

    this.app.stage.addChild(this.scalingContainer);
    this.app.stage.addChild(this.overlayLayer);
    this.scalingContainer.addChild(this.gameLayer);

    this.__start = performance.now();
    this.__nMiliseconds = 0;
    this.spritePool = new Array(this.poolSize);

    for (let i = 0; i < this.poolSize; i++) {
      const spr = new Sprite(Texture.EMPTY);
      spr.width = Interface.TILE_SIZE;
      spr.height = Interface.TILE_SIZE;
      spr.visible = false;
      this.gameLayer.addChild(spr);
      this.spritePool[i] = spr;
    }

    // hook Pixi renderer runners for CPU render timing
    this.app.renderer.runners.prerender.add(this);
    this.app.renderer.runners.postrender.add(this);

    this.animationRenderer = new AnimationRenderer();
    this.tileRenderer = new TileRenderer(this.animationRenderer);
    this.creatureRenderer = new CreatureRenderer(this.animationRenderer);
    this.itemRenderer = new ItemRenderer();
  }

  static async create(): Promise<Renderer> {
    const tileSize = Interface.TILE_SIZE;
    const baseCols = Interface.TILE_WIDTH;
    const baseRows = Interface.TILE_HEIGHT;
    const baseWidth = baseCols * tileSize;
    const baseHeight = baseRows * tileSize;

    const viewport = window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight };
    const scaleX = viewport.width / baseWidth;
    const scaleY = viewport.height / baseHeight;
    const scale = Math.floor(Math.min(scaleX, scaleY) * 100) / 100;

    const width = Math.floor(baseWidth * scale);
    const height = Math.floor(baseHeight * scale);

    const app = new Application();
    await app.init({
      width,
      height,
      antialias: false,
      resolution: 1,
      backgroundAlpha: 0,
      roundPixels: false,
      preference: 'webgl',
    });

    await BMFontLoader.load('/png/fonts/Tibia-Border-16px-Subtle.xml');

    const container = document.getElementById("game-container")!;
    container.innerHTML = "";
    container.appendChild(app.canvas);

    const renderer = new Renderer(app);
    renderer.resizeAndScale();

    window.addEventListener("resize", () => {
      renderer.handleResize();
    });

    return renderer;
  }

  public resizeAndScale(): void {
    const tileSize = Interface.TILE_SIZE;
    const baseCols = Interface.TILE_WIDTH;
    const baseRows = Interface.TILE_HEIGHT;
    const baseWidth = baseCols * tileSize;
    const baseHeight = baseRows * tileSize;

    const scaleX = this.app.screen.width / baseWidth;
    const scaleY = this.app.screen.height / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    this.scalingContainer.scale.set(scale);
    this.scalingContainer.x = Math.round((this.app.screen.width  - baseWidth  * scale) / 2);
    this.scalingContainer.y = Math.round((this.app.screen.height - baseHeight * scale) / 2);
  }

  public handleResize(): void {
    const tileSize = Interface.TILE_SIZE;
    const baseCols = Interface.TILE_WIDTH;
    const baseRows = Interface.TILE_HEIGHT;
    const baseWidth = baseCols * tileSize;
    const baseHeight = baseRows * tileSize;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const aspectRatio = baseWidth / baseHeight;
    const viewportRatio = viewportWidth / viewportHeight;

    let targetWidth: number;
    let targetHeight: number;

    if (viewportRatio > aspectRatio) {
      targetHeight = viewportHeight;
      targetWidth = targetHeight * aspectRatio;
    } else {
      targetWidth = viewportWidth;
      targetHeight = targetWidth / aspectRatio;
    }

    this.app.renderer.resize(Math.floor(targetWidth), Math.floor(targetHeight));
    this.resizeAndScale();
  }

  public render(): void {
    this.__increment();
    this.__renderWorld();
    this.__renderOther();
    this.__triggerTestAnimations();
  }

  private __triggerTestAnimations(): void {
    const now = performance.now();
    if (now - this.lastTestAnimationTime >= this.TEST_ANIMATION_INTERVAL) {
      this.addTestDistanceAnimations();
      this.addTestTileAnimations();
      this.lastTestAnimationTime = now;
    }
  }

  private __increment(): void {
    this.debugger.__nFrames++;
    this.__nMiliseconds = performance.now() - this.__start;
  }

  public getStaticScreenPosition(position: Position): Position {
    const projectedPlayer = window.gameClient.player!.getPosition().projected();
    const projectedThing = position.projected();
    const x = ((Interface.TILE_WIDTH-1)/2) + window.gameClient.player!.getMoveOffset().x + projectedThing.x - projectedPlayer.x;
    const y = ((Interface.TILE_HEIGHT-1)/2) + window.gameClient.player!.getMoveOffset().y + projectedThing.y - projectedPlayer.y;
    return new Position(x, y, 0);
  }

  public getCreatureScreenPosition(creature: Creature): Position {
    const staticPosition = this.getStaticScreenPosition(creature.getPosition());
    const creatureMoveOffset = creature.getMoveOffset();
    const elevationOffset = creature.renderer.getElevationOffset();

    return new Position(
      staticPosition.x - creatureMoveOffset.x - elevationOffset,
      staticPosition.y - creatureMoveOffset.y - elevationOffset,
      0
    );
  }

  getWorldCoordinates(event: MouseEvent): Tile | null {
    const global = new Point();
    this.app.renderer.events.mapPositionToPoint(global, event.clientX, event.clientY);
    const local = this.scalingContainer.toLocal(global);

    const sX = local.x / Interface.TILE_SIZE;
    const sY = local.y / Interface.TILE_SIZE;

    const player = window.gameClient.player!;
    const pos = player.getPosition();
    const move = player.getMoveOffset(); // in tile units

    const centerX = (Interface.TILE_WIDTH  - 1) / 2;
    const centerY = (Interface.TILE_HEIGHT - 1) / 2;

    const worldX = Math.floor((sX - centerX - move.x) + 1e-7) + pos.x;
    const worldY = Math.floor((sY - centerY - move.y) + 1e-7) + pos.y;

    const p = new Position(worldX, worldY, pos.z);
    const chunk = window.gameClient.world.getChunkFromWorldPosition(p);
    return chunk ? chunk.getFirstTileFromTop(p.projected()) : null;
  }

  public getOverlayScreenPosition(creature: Creature): { x: number, y: number } {
    const screenPos: Position = this.getCreatureScreenPosition(creature);
    const scale = this.scalingContainer.scale.x;
    const tileSize = Interface.TILE_SIZE;

    let x = (screenPos.x * tileSize) * scale + this.scalingContainer.x;
    let y = (screenPos.y * tileSize) * scale + this.scalingContainer.y;

    y -= 16 * scale;
    x += 4 * scale;

    return { x, y };
  }

  public __renderWorld(): void {
    const tAssembleStart = performance.now();

    // ---- reset per-frame counters ----
    this.poolIndex = 0;
    this.drawCalls = 0;
    this.batchCount = 0;
    this.textureSwitches = 0;

    // only hide what we used last frame
    for (let i = 0; i < this.lastFramePoolUsed; i++) {
      this.spritePool[i].visible = false;
    }
    this.lastFramePoolUsed = 0;

    this.batcher.reset();

    // bind once
    const getStatic = this.getStaticScreenPosition.bind(this);
    const getCreature = this.getCreatureScreenPosition.bind(this);
    const playerZ = window.gameClient.player!.getPosition().z;
    const floors = this.tileRenderer.tileCache;

    for (let f = 0; f < floors.length; f++) {
      const tiles = floors[f];
      if (!tiles || tiles.length === 0) continue;

      for (let t = 0; t < tiles.length; t++) {
        const tile = tiles[t];

        // per-tile style (don’t assume all entries in a “floor” share the same z)
        const worldZ = tile.getPosition().z;

        // OPTION A: dim all lower floors
        const isBelow = worldZ < playerZ;

        // OPTION B (exactly 1 floor below):
        // const isBelow = worldZ === playerZ + 1; // flip +/− if your z increases downward

        const dimStyle = isBelow? { tint: 0xA0A0A0, alpha: 0.85}: undefined;

        const screenPos = getStatic(tile.getPosition());
        this.collectForTile(tile, screenPos, getStatic, getCreature, dimStyle);
      }

      // per-floor distance animations
      this.processDistanceLayer(f, getStatic);
    }

    // push sprites to the pool (still CPU-side)
    this.renderSpriteBatches();

    // record how many pool sprites we actually touched
    this.lastFramePoolUsed = this.poolIndex;

    // assemble CPU timing
    const dt = performance.now() - tAssembleStart;
    this.cpuAssembleMs = dt;
    this.totalAssembleMs += dt;
    this.totalDrawTime += dt; // legacy accumulator if you still use it elsewhere
  }

  private collectForTile(
    tile: Tile,
    screenPos: Position,
    getStatic: (p: Position) => Position,
    getCreature: (c: Creature) => Position,
    dimStyle?: DimStyle
  ): void {
    // base + items (below)
    this.tileRenderer.collectSprites(tile, screenPos, this.batcher, dimStyle);
    this.itemRenderer.collectSpritesForTile(tile, screenPos, this.batcher, dimStyle);

    // creatures (Set<Creature>) — usually only on the current floor
    for (const creature of tile.monsters) {
      if (this.creatureRenderer.shouldDefer(tile, creature)) {
        this.creatureRenderer.defer(tile, creature);
        continue;
      }
      const cPos = getCreature(creature);
      this.creatureRenderer.collectSprites(creature, cPos, this.batcher);
      this.creatureRenderer.collectAnimationSpritesBelow(creature, this.batcher, getCreature);
      this.creatureRenderer.collectAnimationSpritesAbove(creature, this.batcher, getCreature);
    }

    // deferred creatures for this tile
    this.creatureRenderer.renderDeferred(tile, this.batcher);

    // items (on top)
    this.itemRenderer.collectOnTopSpritesForTile(tile, screenPos, this.batcher, dimStyle);

    // tile animations
    this.tileRenderer.collectAnimationSprites(tile, screenPos, this.batcher, getStatic);
  }

  private processDistanceLayer(floorIndex: number, getStatic: (p: Position) => Position): void {
    const layer = this.animationRenderer.animationLayers[floorIndex];
    if (!layer || layer.size === 0) return;

    const rm = this.scratchRemovals;
    rm.length = 0;

    for (const anim of layer) {
      if (anim.expired()) {
        rm.push(anim);
      } else {
        this.animationRenderer.renderDistanceAnimation(anim, anim, this.batcher, getStatic);
      }
    }
    for (let i = 0; i < rm.length; i++) layer.delete(rm[i]);
    rm.length = 0;
  }

  private renderSpriteBatches(): void {
    let poolIndex = this.poolIndex;
    let currentTextureKey = -1;

    this.batcher.forEach((textureKey, sprites) => {
      if (poolIndex >= this.poolSize) return;

      if (textureKey !== currentTextureKey) {
        this.textureSwitches++;
        currentTextureKey = textureKey;
      }
      this.batchCount++;

      for (let i = 0; i < sprites.length; i++) {
        if (poolIndex >= this.poolSize) break;
        const spriteData = sprites[i];

        const spr = this.spritePool[poolIndex++];
        spr.texture = spriteData.sprite.texture;
        spr.x = spriteData.x;
        spr.y = spriteData.y;
        spr.width = spriteData.width;
        spr.height = spriteData.height;
        spr.visible = true;
        spr.filters = spriteData.outline ? [this.hoverOutline] : null;
        spr.tint = spriteData.tint ?? 0xFFFFFF;
        spr.alpha = spriteData.alpha ?? 1;
        spr.blendMode = spriteData.blendMode ?? 'normal';

        this.drawCalls++;
      }
    });

    this.poolIndex = poolIndex;
  }

  public __renderOther(): void {
    window.gameClient.player!.equipment.render();
    window.gameClient.interface.modalManager.render();
    this.__renderContainers();
    window.gameClient.world.clock.updateClockDOM();
    window.gameClient.interface.screenElementManager.render();
    window.gameClient.interface.hotbarManager.render();
    this.debugger.renderStatistics();
  }

  public __renderContainers(): void {
    window.gameClient.player!.__openedContainers.forEach((container: any) => container.__renderAnimated());
  }

  public __handleVisibiliyChange(_event: Event): void {
    if (!document.hidden) return;
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: any) => {
      creature.renderer.setMovementEvent(null);
    });
  }

  public __drawCastbar(_creature: any): void {
    // (left as-is for now)
  }

  public addTestDistanceAnimations(): void {
    this.animationRenderer.addTestDistanceAnimations();
  }

  public addTestTileAnimations(): void {
    this.animationRenderer.addTestTileAnimations();
  }
}

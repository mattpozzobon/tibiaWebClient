import { Application, Container, Sprite, Texture, Point, Filter } from 'pixi.js';
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
import { BatchSprite } from '../types/types';

export default class Renderer {
  __nMiliseconds: number;
  private lastTestAnimationTime = 0;
  private readonly TEST_ANIMATION_INTERVAL = 1000;

  public debugger: Debugger;

  private __start: number;
  public totalDrawTime = 0;
  public drawCalls = 0;
  public batchCount = 0;
  public textureSwitches = 0;

  public hoverOutline: Filter;
  private readonly outlineFilters: Filter[]; // reuse array

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
  public poolIndex = 0;

  private batches = new Map<number, BatchSprite[]>(); // number uid -> entries
  private lastUsed = 0;
  private __pt = new Point(); // reused Point for hit conversion

  constructor(app: Application) {
    this.app = app;

    this.debugger = new Debugger();
    this.scalingContainer = new Container();
    this.overlayLayer = new Container();
    this.gameLayer = new Container();
    this.hoverOutline = new OutlineFilter(1, 0xFFFFFF);
    this.outlineFilters = [this.hoverOutline];

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

    this.tileRenderer = new TileRenderer();
    this.creatureRenderer = new CreatureRenderer();
    this.itemRenderer = new ItemRenderer();
    this.animationRenderer = new AnimationRenderer();
  }

  static async create(): Promise<Renderer> {
    const tileSize = Interface.TILE_SIZE;
    const baseCols = Interface.TILE_WIDTH;
    const baseRows = Interface.TILE_HEIGHT;
    const baseWidth = baseCols * tileSize;
    const baseHeight = baseRows * tileSize;

    const viewport = (window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight }) as { width: number; height: number };
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
    window.addEventListener("resize", () => renderer.handleResize());
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

    // keep outline thickness visually consistent across resolutions
    const s = this.scalingContainer.scale.x;
    (this.hoverOutline as any).thickness = Math.max(1, Math.round(2 * s));
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

  private resetBatches(): void {
    // reuse arrays to avoid GC
    for (const arr of this.batches.values()) arr.length = 0;
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

  public setAmbientColor(_r: number, _g: number, _b: number, _a: number): void {}
  public setWeather(_bool: boolean): void {}

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
    // DOM -> global (handles CSS + DPR)
    const global = this.__pt;
    this.app.renderer.events.mapPositionToPoint(global, event.clientX, event.clientY);
    // global -> local (undo scale + letterbox)
    const local = this.scalingContainer.toLocal(global);

    // pixels -> tile coords (screen-space)
    const sX = local.x / Interface.TILE_SIZE;
    const sY = local.y / Interface.TILE_SIZE;

    // invert getStaticScreenPosition math
    const player = window.gameClient.player!;
    const pos = player.getPosition();
    const move = player.getMoveOffset();
    const centerX = (Interface.TILE_WIDTH  - 1) / 2;
    const centerY = (Interface.TILE_HEIGHT - 1) / 2;

    const worldX = Math.floor((sX - centerX - move.x) + 1e-7) + pos.x;
    const worldY = Math.floor((sY - centerY - move.y) + 1e-7) + pos.y;

    const p = new Position(worldX, worldY, pos.z);
    const chunk = window.gameClient.world.getChunkFromWorldPosition(p);
    return chunk ? chunk.getFirstTileFromTop(p.projected()) : null;
  }

  public getOverlayScreenPosition(creature: Creature): { x: number, y: number } {
    const renderer = window.gameClient.renderer;
    const screenPos: Position = renderer.getCreatureScreenPosition(creature);
    const scale = renderer.scalingContainer.scale.x;
    const tileSize = Interface.TILE_SIZE;

    let x = (screenPos.x * tileSize) * scale + renderer.scalingContainer.x;
    let y = (screenPos.y * tileSize) * scale + renderer.scalingContainer.y;

    y -= 16 * scale;
    x += 4 * scale;

    return { x, y };
  }

  public __renderWorld(): void {
    const t0 = performance.now();

    // cheap pool reset
    for (let i = 0; i < this.lastUsed; i++) {
      const spr = this.spritePool[i];
      spr.visible = false;
      spr.filters = null;
    }
    this.poolIndex = 0;
    this.drawCalls = 0;
    this.batchCount = 0;
    this.textureSwitches = 0;

    const tileCache = this.tileRenderer.tileCache;
    this.resetBatches();

    for (let floor = 0; floor < tileCache.length; floor++) {
      const tiles = tileCache[floor];

      for (const tile of tiles) {
        const screenPos = this.getStaticScreenPosition(tile.getPosition());

        this.tileRenderer.collectSprites(tile, screenPos, this.batches);
        this.itemRenderer.collectSpritesForTile(tile, screenPos, this.batches);

        tile.monsters.forEach((creature: Creature) => {
          if (this.creatureRenderer.shouldDefer(tile, creature)) {
            this.creatureRenderer.defer(tile, creature);
            return;
          }
          this.creatureRenderer.collectSprites(creature, this.getCreatureScreenPosition(creature), this.batches);
          this.creatureRenderer.collectAnimationSpritesBelow(creature, this.batches, this.getCreatureScreenPosition.bind(this));
          this.creatureRenderer.collectAnimationSpritesAbove(creature, this.batches, this.getCreatureScreenPosition.bind(this));
        });

        this.creatureRenderer.renderDeferred(tile, this.batches);
        this.itemRenderer.collectOnTopSpritesForTile(tile, screenPos, this.batches);
        this.tileRenderer.collectAnimationSprites(tile, screenPos, this.batches, this.getStaticScreenPosition.bind(this));
      }

      // distance animations (by floor)
      const animationLayer = this.animationRenderer.animationLayers[floor];
      if (animationLayer && animationLayer.size > 0) {
        const toRemove: any[] = [];
        animationLayer.forEach((animation: any) => {
          if (animation.expired()) toRemove.push(animation);
          else this.animationRenderer.renderDistanceAnimation(animation, animation, this.batches, this.getStaticScreenPosition.bind(this));
        });
        toRemove.forEach(a => animationLayer.delete(a));
      }
    }

    this.renderSpriteBatches(this.batches);

    const t1 = performance.now();
    this.totalDrawTime += t1 - t0;
    this.lastUsed = this.poolIndex;
  }

  private renderSpriteBatches(spriteBatches: Map<number, BatchSprite[]>): void {
    let poolIndex = this.poolIndex;
    let currentTextureKey = -1;

    for (const [textureKey, sprites] of spriteBatches) {
      if (poolIndex >= this.poolSize) break;

      if (textureKey !== currentTextureKey) {
        this.textureSwitches++;
        currentTextureKey = textureKey;
      }
      this.batchCount++;

      for (const spriteData of sprites) {
        if (poolIndex >= this.poolSize) break;

        const spr = this.spritePool[poolIndex++];
        spr.texture = spriteData.sprite.texture;
        spr.x = spriteData.x;
        spr.y = spriteData.y;
        spr.width = spriteData.width;
        spr.height = spriteData.height;
        spr.visible = true;
        spr.filters = spriteData.outline ? this.outlineFilters : null;
        this.drawCalls++;
      }
    }

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

  public __drawCastbar(creature: any): void {
    let position = this.getCreatureScreenPosition(creature);
    position.y += 6 / Interface.TILE_SIZE;
    let fraction = creature.getCastFraction();
    if (fraction === 1) creature.endCast();
    if (creature.__spell.channel !== null) fraction = 1 - fraction;
  }

  public addTestDistanceAnimations(): void {
    this.animationRenderer.addTestDistanceAnimations();
  }

  public addTestTileAnimations(): void {
    this.animationRenderer.addTestTileAnimations();
  }
}

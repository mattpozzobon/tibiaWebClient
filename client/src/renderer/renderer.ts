import { Application, Container, Sprite, Texture } from 'pixi.js';
import Debugger from "../utils/debugger";
import Interface from "../ui/interface";
import Position from "../game/position";
import Creature from "../game/creature";
import TileRenderer from './tile-renderer';
import ItemRenderer from './item-renderer';
import CreatureRenderer from './creature-renderer';
import AnimationRenderer from './animation-renderer';

export default class Renderer {
  __nMiliseconds: number;
  private lastTestAnimationTime: number = 0;
  private readonly TEST_ANIMATION_INTERVAL: number = 1000; // 1 seconds

  //public screen: Canvas;
  // public lightscreen: LightCanvas;
  // public weatherCanvas: WeatherCanvas;
  // public outlineCanvas: OutlineCanvas;
  public debugger: Debugger;

  private __start: number;
  public totalDrawTime: number = 0;
  public drawCalls: number = 0;
  public batchCount: number = 0;
  public textureSwitches: number = 0;


  public app: Application;
  public tileRenderer: TileRenderer;
  public itemRenderer: ItemRenderer;
  public scalingContainer: Container;
  public creatureRenderer: CreatureRenderer;
  public animationRenderer: AnimationRenderer;
  public gameLayer: Container;

  public spritePool: Sprite[] = [];
  public readonly poolSize = 28 * 14 * 50; // (enough for all tiles + items + some headroom)
  public poolIndex: number = 0;
 
  constructor(app: Application) {
    //this.screen = new Canvas("screen", Interface.SCREEN_WIDTH_MIN, Interface.SCREEN_HEIGHT_MIN);
    //this.lightscreen = new LightCanvas(null, Interface.SCREEN_WIDTH_MIN, Interface.SCREEN_HEIGHT_MIN);
    //this.weatherCanvas = new WeatherCanvas(this.screen);
    //this.outlineCanvas = new OutlineCanvas(null, 130, 130);

    this.app = app;

    this.debugger = new Debugger();
    this.scalingContainer = new Container();
    this.gameLayer = new Container();

    this.app.stage.addChild(this.scalingContainer);
    this.scalingContainer.addChild(this.gameLayer);
    
    this.__start = performance.now();
    this.__nMiliseconds = 0;
    this.spritePool = new Array(this.poolSize);
    
    for (let i = 0; i < this.poolSize; i++) {
      const spr = new Sprite(Texture.EMPTY);
      spr.width = 32;
      spr.height = 32;
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
  
    const viewport = window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight };
    const scaleX = viewport.width / baseWidth;
    const scaleY = viewport.height / baseHeight;
    const scale = Math.floor(Math.min(scaleX, scaleY) * 100) / 100; // Optional: snap to 0.01 step
  
    const width = Math.floor(baseWidth * scale);
    const height = Math.floor(baseHeight * scale);
  
    const app = new Application();
    await app.init({
      width,
      height,
      antialias: false,
      resolution: 1,
      backgroundAlpha: 0,
    });
  
    const container = document.getElementById("game-container")!;
    container.innerHTML = "";
    container.appendChild(app.canvas);
  
    const renderer = new Renderer(app);
    renderer.resizeAndScale();
  
    window.addEventListener("resize", () => {
      renderer.handleResize(); // custom function to recompute
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
    this.scalingContainer.x = (this.app.screen.width - baseWidth * scale) / 2;
    this.scalingContainer.y = (this.app.screen.height - baseHeight * scale) / 2;
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
      // Window is wider than game: fit by height
      targetHeight = viewportHeight;
      targetWidth = targetHeight * aspectRatio;
    } else {
      // Window is taller than game: fit by width
      targetWidth = viewportWidth;
      targetHeight = targetWidth / aspectRatio;
    }
  
    this.app.renderer.resize(Math.floor(targetWidth), Math.floor(targetHeight));
    this.resizeAndScale(); // this uses TILE_WIDTH/HEIGHT to center the scaled layer
  }
  

  public render(): void {
    // Main entry point called every frame.
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
    // Increments the renderer by a number of milliseconds
    this.debugger.__nFrames++;
    this.__nMiliseconds = performance.now() - this.__start;
  }

  public setAmbientColor(r: number, g: number, b: number, a: number): void {
    // Delegates to the lightscreen and sets the ambient color of the world to rgba
    //this.lightscreen.setAmbientColor(r, g, b, a);
  }
  
  public setWeather(bool: boolean): void {
    // Sets the weather to either on/off
    //this.weatherCanvas.setWeather(Number(bool));
  }
  
  public getStaticScreenPosition(position: Position): Position {
    // Return the static position of a particular world position
    const projectedPlayer = window.gameClient.player!.getPosition().projected();
    const projectedThing = position.projected();
    const x = ((Interface.TILE_WIDTH-1)/2) + window.gameClient.player!.getMoveOffset().x + projectedThing.x - projectedPlayer.x;
    const y = ((Interface.TILE_HEIGHT-1)/2) + window.gameClient.player!.getMoveOffset().y + projectedThing.y - projectedPlayer.y;
    return new Position(x, y, 0);
  }
  
  public getCreatureScreenPosition(creature: Creature): Position {
    // Returns the creature position which is a static position plus the creature move offset
    const staticPosition = this.getStaticScreenPosition(creature.getPosition());
    const creatureMoveOffset = creature.getMoveOffset();
    return new Position(
      staticPosition.x - creatureMoveOffset.x,
      staticPosition.y - creatureMoveOffset.y,
      0
    );
  }
  
  public __renderWorld(): void {
    const t0 = performance.now();
   
    // Reset pool for this frame
    this.poolIndex = 0;
    this.drawCalls = 0;
    this.batchCount = 0;
    this.textureSwitches = 0;

    for (let i = 0; i < this.poolSize; i++) {
      this.spritePool[i].visible = false;
    }
   
    const tileCache = this.tileRenderer.tileCache; // Tile[][], floors from 0 (bottom) up
   
    // Collect all sprites by texture for batching
    const spriteBatches = new Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>();
     
    // For each floor, collect sprites instead of rendering immediately
    for (let floor = 0; floor < tileCache.length; floor++) {
      const tiles = tileCache[floor];
 
      for (const tile of tiles) {
        const screenPos = this.getStaticScreenPosition(tile.getPosition());
         
        // Collect tile sprites
        this.tileRenderer.collectSprites(tile, screenPos, spriteBatches);
         
        // Collect item sprites
        this.itemRenderer.collectSpritesForTile(tile, screenPos, spriteBatches);

        // Collect creature sprites
        tile.monsters.forEach((creature: Creature) => {
          if (this.creatureRenderer.shouldDefer(tile, creature)) {
            this.creatureRenderer.defer(tile, creature);
            return; // Skip rendering this creature on current tile
          }
          
          this.creatureRenderer.collectSprites(creature, this.getCreatureScreenPosition(creature), spriteBatches);
          
          // Collect creature animations
          this.creatureRenderer.collectAnimationSpritesBelow(creature, spriteBatches, this.getCreatureScreenPosition.bind(this));
          this.creatureRenderer.collectAnimationSpritesAbove(creature, spriteBatches, this.getCreatureScreenPosition.bind(this));
        });

        // Render deferred creatures on this tile
        this.creatureRenderer.renderDeferred(tile, spriteBatches);

        // Collect on-top item sprites
        this.itemRenderer.collectOnTopSpritesForTile(tile, screenPos, spriteBatches);

        // Collect tile animations
        this.tileRenderer.collectAnimationSprites(tile, screenPos, spriteBatches, this.getStaticScreenPosition.bind(this));
      }

      // Render distance animations for this floor
      const animationLayer = this.animationRenderer.animationLayers[floor];
      if (animationLayer && animationLayer.size > 0) {
        const animationsToRemove: any[] = [];
        
        animationLayer.forEach((animation: any) => {
          if (animation.expired()) {
            animationsToRemove.push(animation);
          } else {
            this.animationRenderer.renderDistanceAnimation(animation, animation, spriteBatches, this.getStaticScreenPosition.bind(this));
          }
        });
        
        // Batch remove expired animations
        animationsToRemove.forEach(animation => {
          animationLayer.delete(animation);
        });
      }
    }
     
    // Render all sprites in texture batches
    this.renderSpriteBatches(spriteBatches);
 
    const t1 = performance.now();
    this.totalDrawTime += t1 - t0;
  }
  
  private renderSpriteBatches(spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    let poolIndex = this.poolIndex;
    let currentTextureKey = '';
    
    // Render each texture batch
    for (const [textureKey, sprites] of spriteBatches) {
      if (poolIndex >= this.poolSize) break;
      
      // Only increment texture switches when we actually switch textures
      if (textureKey !== currentTextureKey) {
        this.textureSwitches++;
        currentTextureKey = textureKey;
      }
      this.batchCount++;
      
      // Render all sprites in this batch
      for (const spriteData of sprites) {
        if (poolIndex >= this.poolSize) break;
        
        const spr = this.spritePool[poolIndex++];
        spr.texture = spriteData.sprite.texture;
        spr.x = spriteData.x;
        spr.y = spriteData.y;
        spr.width = spriteData.width;
        spr.height = spriteData.height;
        spr.visible = true;
        this.drawCalls++;
      }
    }
    
    this.poolIndex = poolIndex;
  }
  
  public __renderOther(): void {
    // Renders other information to the screen
    window.gameClient.player!.equipment.render();
    window.gameClient.interface.modalManager.render();
    this.__renderContainers();
    window.gameClient.world.clock.updateClockDOM();
    window.gameClient.interface.screenElementManager.render();
    window.gameClient.interface.hotbarManager.render();
    this.debugger.renderStatistics();
  }
  
  public __renderContainers(): void {
    // Handles a tab-out event of the game window
    window.gameClient.player!.__openedContainers.forEach((container: any) => container.__renderAnimated());
  }
  
  public __handleVisibiliyChange(event: Event): void {
    // Handles a tab-out event of the game window
    if (!document.hidden) {
      return;
    }
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: any) => {
      creature.renderer.setMovementEvent(null);
    });
  }
  
  public __drawCastbar(creature: any): void {
    // Draws a castbar on top of the creature
    let position = this.getCreatureScreenPosition(creature);
    position.y += 6 / 32;
    let fraction = creature.getCastFraction();
    let color = "white";
    if (fraction === 1) {
      creature.endCast();
    }
    if (creature.__spell.channel !== null) {
      fraction = 1 - fraction;
    }
    // TODO: check this
    //this.screen.drawBar(32, 4, position, fraction, color);
  } 

  public addTestDistanceAnimations(): void {
    // Public method to trigger test distance animations
    this.animationRenderer.addTestDistanceAnimations();
  }

  public addTestTileAnimations(): void {
    // Public method to trigger test tile animations
    this.animationRenderer.addTestTileAnimations();
  }
}

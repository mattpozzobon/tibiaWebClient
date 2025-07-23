import { Application, Container, Sprite } from 'pixi.js';
import Canvas from "./canvas";
import LightCanvas from "./light-canvas";
import WeatherCanvas from "./weather-canvas";
import OutlineCanvas from "./outline-canvas";
import Debugger from "../utils/debugger";
import Interface from "../ui/interface";
import Item from "../game/item";
import Position from "../game/position";
import DistanceAnimation from "../utils/distance-animation";
import ConditionManager from "../game/condition";
import { PropBitFlag } from "../utils/bitflag";
import { CONST } from "../helper/appContext";
import LoopedAnimation from "../utils/animationLooped";
import BoxAnimation from "../utils/box-animation";
import Tile from "../game/tile";
import Creature from "../game/creature";
import Chunk from "../core/chunk";
import Animation from "../utils/animation";
import FrameGroup from '../utils/frame-group';
import TileRenderer from './tile-renderer';

export default class Renderer {
  __animationLayers = new Array<Set<any>>();
  __nMiliseconds: number;

  public screen: Canvas;
  public lightscreen: LightCanvas;
  public weatherCanvas: WeatherCanvas;
  public outlineCanvas: OutlineCanvas;
  public debugger: Debugger;

  private __start: number;
  public __totalDrawTime: number;

  public app: Application;
  public tileRenderer: TileRenderer;

  constructor(app: Application) {
    this.screen = new Canvas("screen", Interface.SCREEN_WIDTH_MIN, Interface.SCREEN_HEIGHT_MIN);
    this.lightscreen = new LightCanvas(null, Interface.SCREEN_WIDTH_MIN, Interface.SCREEN_HEIGHT_MIN);
    this.weatherCanvas = new WeatherCanvas(this.screen);
    this.outlineCanvas = new OutlineCanvas(null, 130, 130);

    this.app = app;
    this.tileRenderer = new TileRenderer(app, this.getStaticScreenPosition.bind(this));
    this.debugger = new Debugger();

    this.__start = performance.now();
    this.__nMiliseconds = 0;
    this.__totalDrawTime = 0;

    this.__createAnimationLayers();
  }

  static async create(): Promise<Renderer> {
    const app = new Application();
    await app.init({
      width: Interface.SCREEN_WIDTH_MIN,
      height: Interface.SCREEN_HEIGHT_MIN,
      backgroundColor: 0x1099bb,
      antialias: false,
      resolution: 1,
      backgroundAlpha: 0,
    });

    const container = document.getElementById("game-container")!;
    container.appendChild(app.canvas);

    return new Renderer(app);
  }

  public render(): void {
    // Main entry point called every frame.
    this.__increment();
    this.__renderWorld();
    this.__renderOther();
  }

  private __increment(): void {
    // Increments the renderer by a number of milliseconds
    this.debugger.__nFrames++;
    this.__nMiliseconds = performance.now() - this.__start;
  }

  public setAmbientColor(r: number, g: number, b: number, a: number): void {
    // Delegates to the lightscreen and sets the ambient color of the world to rgba
    this.lightscreen.setAmbientColor(r, g, b, a);
  }
  
  public setWeather(bool: boolean): void {
    // Sets the weather to either on/off
    this.weatherCanvas.setWeather(Number(bool));
  }
  
  public addDistanceAnimation(packet: { type: number; from: Position; to: Position }): void {
    // Adds a distance animation
    const animationId = window.gameClient.dataObjects.getDistanceAnimationId(packet.type);
    if (animationId === null) {
      return;
    }
    const animation = new DistanceAnimation(animationId, packet.from, packet.to);
    this.__animationLayers[packet.from.z % 8].add(animation);
  }
  
  public addPositionAnimation(packet: { position: Position; type: number }): any {
    // Adds an animation on the given tile position
    const tile = window.gameClient.world.getTileFromWorldPosition(packet.position);
    if (tile === null) {
      return;
    }
    const animationId = window.gameClient.dataObjects.getAnimationId(packet.type);
    if (animationId === null) {
      return;
    }
    return tile.addAnimation(new Animation(animationId));
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

    this.tileRenderer.render();

    const t1 = performance.now();
    this.__totalDrawTime += t1 - t0; // μs
  }
  
  // public __renderFloor(tiles: any[], index: number): void {
  //   // Render all the tiles on the floor
  //   tiles.forEach(this.__renderFullTile, this);
  
  //   // Render the animations on this layer
  //   this.__animationLayers[index].forEach((animation: any) => {
  //     this.__renderDistanceAnimation(animation, this.__animationLayers[index]);
  //   }, this);
  // }  

  // public __renderTile(tile: any): void {
  //   // Rendering function for a particular tile
  //   if (tile.id === 0) {
  //     return;
  //   }
  //   // Reset the elevation of the tile
  //   tile.setElevation(0);
  //   // Get the position of the tile on the game screen
  //   const position = this.getStaticScreenPosition(tile.getPosition());
  //   // Render light if enabled and applicable
  //   if (window.gameClient.interface.settings.isLightingEnabled() && tile.isLight()) {
  //     this.__renderLight(tile, position, tile, undefined);
  //   }
  //   // Draw the sprite to the screen
  //   this.screen.drawSprite(tile, position, 64);
  // }
  
  public __renderFullTile(tile: any): void {
    // Renders a full tile in the proper order (tile -> objects -> animations)
    //this.__renderTile(tile);
    this.__renderTileObjects(tile);
    this.__renderTileAnimations(tile);
  }
  
  public __renderDistanceAnimation(animation: any, thing: any): void {
    // Renders a distance animation on a tile
    if (animation.expired()) {
      thing.delete(animation);
    }
    const position = this.getStaticScreenPosition(animation.getPosition());
    this.screen.drawDistanceAnimation(animation, position);
  }
  
  public __renderAnimation(animation: any, thing: any): void {
    // Renders an animation to the screen
    if (animation.expired()) {
      thing.deleteAnimation(animation);
    }
  
    // There is a flag that identifies light coming from the tile
    if (!(animation instanceof BoxAnimation)) {
      if (window.gameClient.interface.settings.isLightingEnabled() && animation.isLight()) {
        const position = this.getStaticScreenPosition(thing.getPosition());
        this.__renderLight(thing, position, animation, false);
      }
    }
  
    // Determine the rendering position
    if (animation instanceof BoxAnimation) {
      this.screen.drawInnerCombatRect(animation, this.getCreatureScreenPosition(thing));
    } else if (thing instanceof Tile) {
      this.screen.drawSprite(animation, this.getStaticScreenPosition(thing.getPosition()), 32);
    } else if (thing instanceof Creature) {
      this.screen.drawSprite(animation, this.getCreatureScreenPosition(thing), 32);
    }
  
    this.screen.context.globalAlpha = 1;
  }
  
  public __renderTileAnimations(tile: any): void {
    // Renders the animations that are present on the tile
    tile.__animations.forEach((animation: any) => {
      this.__renderAnimation(animation, tile);
    }, this);
  }
  
  public __renderLightThing(position: Position, thing: any, intensity: any): void {
    // Renders light bubble for a particular tile or item
    const info = thing.getDataObject().properties.light;
    const phase = 0;
    const size =
      info.level + 0.2 * info.level * Math.sin(phase + window.gameClient.renderer.debugger.__nFrames / (8 * 2 * Math.PI));
    this.lightscreen.renderLightBubble(position.x, position.y, size, info.color);
  }
  
  public __renderLight(tile: any, position: Position, thing: any, intensity: any): void {
    // Renders the light at a position
    const floor = window.gameClient.world
      .getChunkFromWorldPosition(tile.getPosition())
      .getFirstFloorFromBottomProjected(tile.getPosition());
  
    // Confirm light is visible and should be rendered
    if (floor === null || floor >= window.gameClient.player!.getMaxFloor()) {
      this.__renderLightThing(position, thing, intensity);
    }
  }
  
  public __renderTileObjects(tile: any): void {
    // Renders all objects & creatures on a tile
    const position = this.getStaticScreenPosition(tile.getPosition());
  
    // Reference the items to be rendered
    const items = tile.items;
  
    // Render the items on the tile
    items.forEach((item: Item, i: number) => {
      // Immediately skip objects with on-top property: these are rendered later
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) {
        return;
      }
  
      // Should render item light?
      if (window.gameClient.interface.settings.isLightingEnabled() && item.isLight()) {
        this.__renderLight(tile, position, item, undefined);
      }
  
      // Handle the current elevation of the tile
      const renderPosition = new Position(
        position.x - tile.__renderElevation,
        position.y - tile.__renderElevation,
        0
      );
  
      // Draw the sprite at the right position
      this.screen.drawSprite(item, renderPosition, 32);
  
      if (item.isPickupable() && i === items.length - 1 && tile === window.gameClient.mouse.getCurrentTileHover()) {
        this.screen.drawSpriteOverlay(item, renderPosition, 32);
      }
      
      // Add the elevation of the item
      if (item.isElevation()) {
        tile.addElevation(item.getDataObject().properties.elevation);
      }
    }, this);
  
    // Render the entities on the tile
    tile.monsters.forEach((creature: any) => {
      this.__renderCreature(tile, creature, false);
    }, this);
  
    // Render all the entities on this tile that were deferred
    this.__renderDeferred(tile);
  
    // Render the items that always belong on top (e.g., doors)
    this.__renderAlwaysOnTopItems(items, position);
  }

  public __renderAlwaysOnTopItems(items: any[], position: Position): void {
    // Renders the items that are always on top of the other items
    items.forEach((item: any) => {
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) {
        return;
      }
      this.screen.drawSprite(item, position, 32);
    }, this);
  }
  
  public __renderDeferred(tile: any): void {
    // Renders the deferred entities on the tile
    if (tile.__deferredCreatures.size === 0) {
      return;
    }
    tile.__deferredCreatures.forEach((creature: any) => {
      const tileFromWorld = window.gameClient.world.getTileFromWorldPosition(creature.vitals.position);
      this.__renderCreature(tileFromWorld, creature, true);
    }, this);
    tile.__deferredCreatures.clear();
  }
  
  public __renderCreature(tile: any, creature: any, deferred: boolean): void {
    // Render the available creatures to the screen
    if (!window.gameClient.player!.canSee(creature)) {
      return;
    }
    const position = this.getCreatureScreenPosition(creature);
    const renderPosition = new Position(
      position.x - tile.__renderElevation,
      position.y - tile.__renderElevation,
      position.z
    );
    // Should the rendering of the creature be deferred to another tile?
    if (this.__shouldDefer(tile, creature) && !deferred) {
      return this.__defer(tile, creature);
    }
    // Render animations below the creature
    this.__renderCreatureAnimationsBelow(creature);
    // Render the target box around the creature if applicable
    if (window.gameClient.player!.isCreatureTarget(creature)) {
      this.screen.drawOuterCombatRect(this.getCreatureScreenPosition(creature), Interface.COLORS.RED);
    }
    if (creature.hasCondition(ConditionManager.INVISIBLE)) {
      this.__renderAnimation(LoopedAnimation.MAGIC_BLUE, creature);
    } else {
      // Otherwise render the character to the screen
      this.screen.drawCharacter(creature, renderPosition, 32, 0.25);
    }
    creature.__renderElevation = 0;
    // Render animations above the creature
    this.__renderCreatureAnimationsAbove(creature);
  }
  
  public __defer(tile: any, creature: any): void {
    // Defers rendering of a creature to a new tile
    const deferTile = this.__getDeferTile(tile, creature);
    if (deferTile !== null) {
      deferTile.__deferredCreatures.add(creature);
    }
  }
  
  public __getDeferTile(tile: any, creature: any): any {
    // Get the tile we need to defer the rendering of the creature to
    if (creature.__lookDirection === CONST.DIRECTION.NORTHEAST) {
      return window.gameClient.world.getTileFromWorldPosition(creature.getPosition().south());
    } else if (creature.__lookDirection === CONST.DIRECTION.SOUTHWEST) {
      return window.gameClient.world.getTileFromWorldPosition(creature.getPosition().east());
    } else {
      return window.gameClient.world.getTileFromWorldPosition(creature.__previousPosition);
    }
  }
  
  public __shouldDefer(tile: any, creature: any): boolean {
    // Renders true if the drawing of a creature should be deferred to another tile
    if (creature.__teleported) {
      return false;
    }
    if (!creature.isMoving()) {
      return false;
    }
    if (creature.getPosition().z !== creature.__previousPosition.z) {
      return false;
    }
    if (
      (creature.__lookDirection === CONST.DIRECTION.NORTH ||
        creature.__lookDirection === CONST.DIRECTION.WEST ||
        creature.__lookDirection === CONST.DIRECTION.NORTHWEST)
    ) {
      if (!creature.__previousPosition.equals(tile.getPosition())) {
        return true;
      }
    }
    if (creature.__lookDirection === CONST.DIRECTION.NORTHEAST) {
      if (!creature.__previousPosition.equals(tile.getPosition().west())) {
        return true;
      }
    }
    if (creature.__lookDirection === CONST.DIRECTION.SOUTHWEST) {
      if (!creature.__previousPosition.equals(tile.getPosition().north())) {
        return true;
      }
    }
    return false;
  }
  
  public __renderCreatureAnimationsAbove(creature: any): void {
    // Renders animations above the creature
    creature.__animations.forEach((animation: any) => {
      if (animation.constructor.name !== "BoxAnimation") {
        this.__renderAnimation(animation, creature);
      }
    }, this);
  }
  
  public __renderCreatureAnimationsBelow(creature: any): void {
    // Renders animations below the creature
    creature.__animations.forEach((animation: any) => {
      if (animation.constructor.name === "BoxAnimation") {
        this.__renderAnimation(animation, creature);
      }
    }, this);
  }
  
  public __renderOther(): void {
    // Renders other information to the screen
    //window.gameClient.player!.equipment.render();
    //window.gameClient.interface.modalManager.render();
    //this.__renderContainers();
    //window.gameClient.world.clock.updateClockDOM();
    //window.gameClient.interface.screenElementManager.render();
    //window.gameClient.interface.hotbarManager.render();
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
      creature.__movementEvent = null;
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
  
  public __createAnimationLayers(): void {
    // Creates a set for all animations for a particular layer
    for (let i = 0; i < 8; i++) {
      this.__animationLayers.push(new Set());
    }
  }  
}

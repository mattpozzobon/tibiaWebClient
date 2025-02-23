import LoopedAnimation from "./animationLooped";
import { PropBitFlag } from "./bitflag";
import BoxAnimation from "./box-animation";
import Chunk from "./chunk";
import ConditionManager from "./condition";
import Creature from "./creature";
import DistanceAnimation from "./distance-animation";
import GameClient from "./gameclient";
import { CONST } from "./helper/appContext";
import Interface from "./interface";
import Position from "./position";
import Tile from "./tile";
import Animation from "./animation";
import Canvas from "./canvas";
import LightCanvas from "./light-canvas";
import WeatherCanvas from "./weather-canvas";
import OutlineCanvas from "./outline-canvas";
import Minimap from "./minimap";
import Debugger from "./debugger";

export default class Renderer {
  __animationLayers = new Array();
  // Main game screen canvas.
  public screen: Canvas;
  // Canvas used for lighting effects.
  public lightscreen: LightCanvas;
  // Canvas for weather effects.
  public weatherCanvas: WeatherCanvas;
  // Canvas for rendering item outlines.
  public outlineCanvas: OutlineCanvas;
  // Minimap for world preview.
  public minimap: Minimap;
  // Debugger for internal statistics.
  public debugger: Debugger;

  // Internal state variables.
  private __start: number;
  __nMiliseconds: number;
  public totalDrawTime: number;
  public drawCalls: number;
  public numberOfTiles: number;

  // Cache of tiles to be rendered.
  private __tileCache: any[];
  gameClient: GameClient

  constructor(gameClient: GameClient) {
    // Create main canvases using values from Interface.
    this.gameClient = gameClient;

    this.screen = new Canvas(
      this.gameClient,
      "screen",
      Interface.SCREEN_WIDTH_MIN,
      Interface.SCREEN_HEIGHT_MIN
    );

    this.lightscreen = new LightCanvas(
      this.gameClient,
      null,
      Interface.SCREEN_WIDTH_MIN,
      Interface.SCREEN_HEIGHT_MIN
    );

    this.weatherCanvas = new WeatherCanvas(this.gameClient, this.screen);
    this.outlineCanvas = new OutlineCanvas(this.gameClient, null, 130, 130);
    this.minimap = new Minimap(this.gameClient); // TODO: CHECK IF THIS IS NECESSARY: gameClient.world.width, gameClient.world.height
    this.debugger = new Debugger(this.gameClient);

    // Initialize state variables.
    this.__start = performance.now();
    this.__nMiliseconds = 0;
    this.totalDrawTime = 0;
    this.drawCalls = 0;
    this.numberOfTiles = 0;
    this.__tileCache = [];

    // Create animation layers.
    this.__createAnimationLayers();
  }

  public render(): void {
    // Main entry point called every frame.
    this.__increment();
    this.__renderWorld();
    this.__renderOther();
  }

  public getTileCache(): any[] {
    // Returns the current cache of tiles to be rendered.
    return this.__tileCache;
  }

  public updateTileCache(): void {
    // Update the tile cache based on the player's maximum visible floor.
    this.__tileCache = [];
    this.numberOfTiles = 0;

    const max = this.gameClient.player!.getMaxFloor();
    for (let i = 0; i < max; i++) {
      const tiles = this.__getFloorTilesTiles(i);
      this.__tileCache.push(tiles);
      this.numberOfTiles += tiles.length;
    }
  }

  public takeScreenshot(event: Event): void {
    // Takes a screenshot of the game screen and downloads it.
    event.preventDefault();

    // Create download element.
    const element = document.createElement("a");
    element.download = `screenshot-${new Date().toISOString()}.png`;

    // Render character plates.
    Object.values(this.gameClient.world.activeCreatures).forEach((activeCreature: any) => {
      const style = window.getComputedStyle(
        activeCreature.characterElement.element.querySelector("span")
      );
      const position = this.getCreatureScreenPosition(activeCreature);
      this.screen.renderText(
        activeCreature.name,
        32 * position.x,
        32 * position.y,
        style.color,
        style.font
      );
    }, this);

    // Render text elements.
    this.gameClient.interface.screenElementManager.activeTextElements.forEach((element: any) => {
      const style = window.getComputedStyle(
        element.element.querySelector("span")
      );
      const position = this.getStaticScreenPosition(element.__position);
      this.screen.renderText(
        element.__message,
        32 * position.x,
        32 * position.y,
        style.color,
        style.font
      );
    }, this);

    // Trigger download.
    element.href = this.screen.canvas.toDataURL();
    element.click();
    element.remove();
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
    const animationId = this.gameClient.dataObjects.getDistanceAnimationId(packet.type);
    if (animationId === null) {
      return;
    }
    const animation = new DistanceAnimation(this.gameClient, animationId, packet.from, packet.to);
    this.__animationLayers[packet.from.z % 8].add(animation);
  }
  
  public addPositionAnimation(packet: { position: Position; type: number }): any {
    // Adds an animation on the given tile position
    const tile = this.gameClient.world.getTileFromWorldPosition(packet.position);
    if (tile === null) {
      return;
    }
    const animationId = this.gameClient.dataObjects.getAnimationId(packet.type);
    if (animationId === null) {
      return;
    }
    return tile.addAnimation(new Animation(this.gameClient, animationId));
  }
  
  public getStaticScreenPosition(position: Position): Position {
    // Return the static position of a particular world position
    const projectedPlayer = this.gameClient.player!.getPosition().projected();
    const projectedThing = position.projected();
    const x = 7 + this.gameClient.player!.getMoveOffset().x + projectedThing.x - projectedPlayer.x;
    const y = 5 +this. gameClient.player!.getMoveOffset().y + projectedThing.y - projectedPlayer.y;
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
  
  private __increment(): void {
    // Increments the renderer by a number of milliseconds
    this.debugger.__nFrames++;
    this.__nMiliseconds = performance.now() - this.__start;
  }
  
  private __getFloorTilesTiles(floor: number): Tile[] {
    // Returns the tiles in the viewport sorted by distinctive layers
    const tiles: Tile[] = [];
    this.gameClient.world.chunks.forEach((chunk: Chunk) => {
      chunk.getFloorTiles(floor).forEach((tile: Tile) => {
        if (!this.gameClient.player!.canSee(tile)) {
          return;
        }
        if (tile.id === 0 && tile.items.length === 0 ) { //TODO : && tile.neighbours.length === 1
          return;
        }
        tiles.push(tile);
      });
    });
    return tiles;
  }
  
  public __renderWorld(): void {
    const start = performance.now();
  
    // Clear the full game canvas
    this.screen.clear();
  
    // Render all of the cached tiles: only needs to be updated when the character moves
    this.getTileCache().forEach(this.__renderFloor, this);
  
    // If requested render the weather canvas
    if (this.gameClient.interface.settings.isWeatherEnabled()) {
      this.weatherCanvas.drawWeather();
    }
  
    // Finally draw the lightscreen to the canvas and reset it
    if (this.gameClient.interface.settings.isLightingEnabled()) {
      if (this.gameClient.player!.hasCondition(ConditionManager.LIGHT)) {
        this.lightscreen.renderLightBubble(7, 5, 5, 23);
      } else {
        this.lightscreen.renderLightBubble(7, 5, 2, 23);
      }
      this.screen.context.drawImage(this.lightscreen.canvas, 0, 0);
      this.lightscreen.setup();
    }
  
    this.totalDrawTime += performance.now() - start;
  }
  
  public __renderFloor(tiles: any[], index: number): void {
    // Render all the tiles on the floor
    tiles.forEach(this.__renderFullTile, this);
  
    // Render the animations on this layer
    this.__animationLayers[index].forEach((animation: any) => {
      this.__renderDistanceAnimation(animation, this.__animationLayers[index]);
    }, this);
  }
  
  public __renderFullTile(tile: any): void {
    // Renders a full tile in the proper order (tile -> objects -> animations)
    this.__renderTile(tile);
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
      if (this.gameClient.interface.settings.isLightingEnabled() && animation.isLight()) {
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
      info.level + 0.2 * info.level * Math.sin(phase + this.gameClient.renderer.debugger.__nFrames / (8 * 2 * Math.PI));
    this.lightscreen.renderLightBubble(position.x, position.y, size, info.color);
  }
  
  public __renderLight(tile: any, position: Position, thing: any, intensity: any): void {
    // Renders the light at a position
    const floor = this.gameClient.world
      .getChunkFromWorldPosition(tile.getPosition())
      .getFirstFloorFromBottomProjected(tile.getPosition());
  
    // Confirm light is visible and should be rendered
    if (floor === null || floor >= this.gameClient.player!.getMaxFloor()) {
      this.__renderLightThing(position, thing, intensity);
    }
  }
  
  public __renderTileObjects(tile: any): void {
    // Renders all objects & creatures on a tile
    const position = this.getStaticScreenPosition(tile.getPosition());
  
    // Reference the items to be rendered
    const items = tile.items;
  
    // Render the items on the tile
    items.forEach((item: any, i: number) => {
      // Immediately skip objects with on-top property: these are rendered later
      if (item.hasFlag(PropBitFlag.flags.DatFlagOnTop)) {
        return;
      }
  
      // Should render item light?
      if (this.gameClient.interface.settings.isLightingEnabled() && item.isLight()) {
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
  
      if (item.isPickupable() && i === items.length - 1 && tile === this.gameClient.mouse.getCurrentTileHover()) {
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
      if (!item.hasFlag(PropBitFlag.flags.DatFlagOnTop)) {
        return;
      }
      this.screen.drawSprite(item, position, 32);
    }, this);
  }
  
  public __renderTile(tile: any): void {
    // Rendering function for a particular tile
    if (tile.id === 0) {
      return;
    }
    // Reset the elevation of the tile
    tile.setElevation(0);
    // Get the position of the tile on the game screen
    const position = this.getStaticScreenPosition(tile.getPosition());
    // Render light if enabled and applicable
    if (this.gameClient.interface.settings.isLightingEnabled() && tile.isLight()) {
      this.__renderLight(tile, position, tile, undefined);
    }
    // Draw the sprite to the screen
    this.screen.drawSprite(tile, position, 64);
  }
  
  public __renderDeferred(tile: any): void {
    // Renders the deferred entities on the tile
    if (tile.__deferredCreatures.size === 0) {
      return;
    }
    tile.__deferredCreatures.forEach((creature: any) => {
      const tileFromWorld = this.gameClient.world.getTileFromWorldPosition(creature.__position);
      this.__renderCreature(tileFromWorld, creature, true);
    }, this);
    tile.__deferredCreatures.clear();
  }
  
  public __renderCreature(tile: any, creature: any, deferred: boolean): void {
    // Render the available creatures to the screen
    if (!this.gameClient.player!.canSee(creature)) {
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
    if (this.gameClient.player!.isCreatureTarget(creature)) {
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
      return this.gameClient.world.getTileFromWorldPosition(creature.getPosition().south());
    } else if (creature.__lookDirection === CONST.DIRECTION.SOUTHWEST) {
      return this.gameClient.world.getTileFromWorldPosition(creature.getPosition().east());
    } else {
      return this.gameClient.world.getTileFromWorldPosition(creature.__previousPosition);
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
    this.gameClient.player!.equipment.render();
    this.gameClient.interface.modalManager.render();
    this.__renderContainers();
    this.gameClient.world.clock.updateClockDOM();
    this.gameClient.interface.screenElementManager.render();
    this.gameClient.interface.hotbarManager.render();
    this.debugger.renderStatistics();
  }
  
  public __renderContainers(): void {
    // Handles a tab-out event of the game window
    this.gameClient.player!.__openedContainers.forEach((container: any) => container.__renderAnimated());
  }
  
  public __handleVisibiliyChange(event: Event): void {
    // Handles a tab-out event of the game window
    if (!document.hidden) {
      return;
    }
    Object.values(this.gameClient.world.activeCreatures).forEach((creature: any) => {
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

import Position from "../game/position";
import Tile from "../game/tile";
import Creature from "../game/creature";
import BoxAnimation from "../utils/box-animation";

export default class AnimationRenderer {
  constructor() {
    // Animation renderer initialization
  }

  /**
   * Collect animation sprites for the batching system
   */
  private collectAnimationSprites(
    animation: any, 
    screenPos: Position, 
    thing: any, 
    spriteBatches?: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>
  ): void {
    console.log('collectAnimationSprites: animation', animation, 'screenPos', screenPos);
    if (animation && animation.getSprite) {
      const sprite = animation.getSprite();
      console.log('collectAnimationSprites: got sprite', sprite);
      if (sprite && sprite.texture && spriteBatches) {
        console.log('collectAnimationSprites: sprite has texture', sprite.texture);
        // Add to sprite batches for rendering
        const textureKey = sprite.texture.baseTexture.uid?.toString() || 'animation';
        console.log('collectAnimationSprites: textureKey', textureKey);
        if (!spriteBatches.has(textureKey)) {
          spriteBatches.set(textureKey, []);
        }
        
        const spriteData = {
          sprite: sprite,
          x: screenPos.x * 32,
          y: screenPos.y * 32,
          width: 32,
          height: 32
        };
        
        spriteBatches.get(textureKey)!.push(spriteData);
        console.log('collectAnimationSprites: added sprite to batch, batch size now:', spriteBatches.get(textureKey)!.length);
      } else {
        console.log('collectAnimationSprites: sprite missing texture or spriteBatches not provided', { sprite, spriteBatches });
      }
    } else {
      console.log('collectAnimationSprites: animation missing or no getSprite method', animation);
    }
  }

  /**
   * Render a general animation
   */
  public renderAnimation(
    animation: any, 
    thing: any, 
    spriteBatches?: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getStaticScreenPosition?: (pos: Position) => Position,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    // Renders an animation to the screen
    if (animation.expired()) {
      thing.deleteAnimation(animation);
      return;
    }

    // There is a flag that identifies light coming from the tile
    if (!(animation instanceof BoxAnimation)) {
      if (window.gameClient.interface.settings.isLightingEnabled() && animation.isLight()) {
        const position = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
        this.renderLight(thing, position, animation, false);
      }
    }

    // Determine the rendering position and collect sprites for batching
    let screenPos: Position;
    if (animation instanceof BoxAnimation) {
      screenPos = getCreatureScreenPosition ? getCreatureScreenPosition(thing) : new Position(0, 0, 0);
      // For box animations, we'll need to implement combat rect rendering
      // this.screen.drawInnerCombatRect(animation, screenPos);
    } else if (thing instanceof Tile) {
      screenPos = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
      // Collect animation sprites for tiles
      this.collectAnimationSprites(animation, screenPos, thing, spriteBatches);
    } else if (thing instanceof Creature) {
      screenPos = getCreatureScreenPosition ? getCreatureScreenPosition(thing) : new Position(0, 0, 0);
      // Collect animation sprites for creatures
      this.collectAnimationSprites(animation, screenPos, thing, spriteBatches);
    }
  }

  /**
   * Render tile animations
   */
  public renderTileAnimations(
    tile: any, 
    spriteBatches?: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    // Renders the animations that are present on the tile
    if (tile.__animations && tile.__animations.size > 0) {
      console.log('renderTileAnimations: found', tile.__animations.size, 'animations');
      tile.__animations.forEach((animation: any) => {
        console.log('renderTileAnimations: processing animation', animation);
        this.renderAnimation(animation, tile, spriteBatches, getStaticScreenPosition);
      }, this);
    }
  }

  /**
   * Render distance animations
   */
  public renderDistanceAnimation(
    animation: any, 
    thing: any, 
    spriteBatches?: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    // Renders a distance animation on a tile
    if (animation.expired()) {
      thing.delete(animation);
      return;
    }
    const position = getStaticScreenPosition ? getStaticScreenPosition(animation.getPosition()) : new Position(0, 0, 0);
    // Collect distance animation sprites
    this.collectAnimationSprites(animation, position, thing, spriteBatches);
  }

  /**
   * Render creature animations above the creature
   */
  public renderCreatureAnimationsAbove(
    creature: any, 
    spriteBatches?: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    // Renders animations above the creature
    if (creature.__animations && creature.__animations.length > 0) {
      creature.__animations.forEach((animation: any) => {
        if (animation.constructor.name !== "BoxAnimation") {
          this.renderAnimation(animation, creature, spriteBatches, undefined, getCreatureScreenPosition);
        }
      }, this);
    }
  }

  /**
   * Render creature animations below the creature
   */
  public renderCreatureAnimationsBelow(
    creature: any, 
    spriteBatches?: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    // Renders animations below the creature
    if (creature.__animations && creature.__animations.length > 0) {
      creature.__animations.forEach((animation: any) => {
        if (animation.constructor.name === "BoxAnimation") {
          this.renderAnimation(animation, creature, spriteBatches, undefined, getCreatureScreenPosition);
        }
      }, this);
    }
  }

  /**
   * Render light for animations
   */
  private renderLight(tile: any, position: Position, thing: any, intensity: any): void {
    // Renders the light at a position
    const floor = window.gameClient.world
      .getChunkFromWorldPosition(tile.getPosition())
      .getFirstFloorFromBottomProjected(tile.getPosition());
  
    // Confirm light is visible and should be rendered
    if (floor === null || floor >= window.gameClient.player!.getMaxFloor()) {
      this.renderLightThing(position, thing, intensity);
    }
  }

  /**
   * Render light bubble for a particular tile or item
   */
  private renderLightThing(position: Position, thing: any, intensity: any): void {
    // Renders light bubble for a particular tile or item
    const info = thing.getDataObject().properties.light;
    const phase = 0;
    const size =
      info.level + 0.2 * info.level * Math.sin(phase + window.gameClient.renderer.debugger.__nFrames / (8 * 2 * Math.PI));
    //this.lightscreen.renderLightBubble(position.x, position.y, size, info.color);
  }
} 
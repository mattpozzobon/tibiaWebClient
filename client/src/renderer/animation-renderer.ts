import Position from "../game/position";
import Tile from "../game/tile";
import Creature from "../game/creature";
import BoxAnimation from "../utils/box-animation";
import Animation from "../utils/animation";
import DistanceAnimation from "../utils/distance-animation";

export default class AnimationRenderer {
  animationLayers = new Array();

  constructor() {
    // Animation renderer initialization
    this.__createAnimationLayers();
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
    if (animation && animation.getSprite) {
      const sprite = animation.getSprite();
      if (sprite && sprite.texture && spriteBatches) {
        // Add to sprite batches for rendering
        const textureKey = sprite.texture.baseTexture.uid?.toString() || 'animation';
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
      }
    }
  }

  public __createAnimationLayers(): void {
    // Creates a set for all animations for a particular layer
    for (let i = 0; i < 8; i++) {
      this.animationLayers.push(new Set());
    }
  } 
  /**
   * Add a position animation to a tile
   */
  public addPositionAnimation(packet: { position: Position; type: number }): any {
    // Adds an animation on the given tile position
    const tile = window.gameClient.world.getTileFromWorldPosition(packet.position);
    if (tile === null) {
      return;
    }
    
    let animationId;
    try {
      animationId = window.gameClient.dataObjects.getAnimationId(packet.type);
    } catch (error) {
      console.error('addPositionAnimation: getAnimationId failed', error);
      return;
    }
    
    if (animationId === null) {
      return;
    }
    
    const animation = new Animation(animationId);
    const result = tile.addAnimation(animation);
    return result;
  }

  /**
   * Add a distance animation
   */
  public addDistanceAnimation(packet: { type: number; from: Position; to: Position }): void {
    // Creates a distance animation between two positions
    try {
      // Check if the animation ID exists in data objects
      const animationId = window.gameClient.dataObjects.getDistanceAnimationId(packet.type);
      if (animationId === null) {
        console.error('addDistanceAnimation: animation ID not found for type', packet.type);
        return;
      }
      
      const animation = new DistanceAnimation(animationId, packet.from, packet.to);
      console.log('animation', animation);
      this.animationLayers[packet.from.z % 8].add(animation);

    } catch (error) {
      console.error('addDistanceAnimation: error creating distance animation', error);
    }
  }

  /**
   * Test method to manually add distance animations for testing
   */
  public addTestDistanceAnimations(): void {

    // Test distance animations at specific positions on floor 0
    const testPositions = [
      { from: new Position(63, 59, 9), to: new Position(65, 61, 9) },
      { from: new Position(64, 60, 9), to: new Position(66, 62, 9) },
      { from: new Position(62, 58, 9), to: new Position(64, 60, 9) }
    ];

    testPositions.forEach((pos, index) => {
      // Try different distance animation types (1, 2, 3, 4, 5)
      const animationType = 1; // 1, 2, 3, 4, or 5
      try {
        this.addDistanceAnimation({
          type: animationType,
          from: pos.from,
          to: pos.to
        });
      } catch (error) {
        console.error(`Failed to add test distance animation ${index + 1} with type ${animationType}:`, error);
      }
    });
  }

  /**
   * Test method to manually add tile animations for testing
   */
  public addTestTileAnimations(): void {
    // Test tile animations at specific positions
    const testPositions = [
      new Position(63, 59, 9),
      new Position(64, 60, 9),
      new Position(65, 61, 9)
    ];

    testPositions.forEach((position, index) => {
      // Try different animation types (1, 2, 3, 4, 5)
      const animationType = 1; // 1, 2, 3, 4, or 5
      try {
        this.addPositionAnimation({position: position, type: animationType});
      } catch (error) {
        console.error(`Failed to add test tile animation ${index + 1} with type ${animationType}:`, error);
      }
    });
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
    } else if (thing instanceof DistanceAnimation) {
      // Handle distance animations - use the animation's position
      screenPos = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
      // Collect animation sprites for distance animations
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
      tile.__animations.forEach((animation: any) => {
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
    
    // Calculate interpolated position like the old renderer
    const fraction = animation.getFraction();
    const fromPos = getStaticScreenPosition ? getStaticScreenPosition(animation.fromPosition) : new Position(0, 0, 0);
    const toPos = getStaticScreenPosition ? getStaticScreenPosition(animation.toPosition) : new Position(0, 0, 0);
    
    const renderPosition = new Position(
      fromPos.x + fraction * (toPos.x - fromPos.x),
      fromPos.y + fraction * (toPos.y - fromPos.y),
      0
    );
    
    // Collect sprites for the interpolated position
    this.collectAnimationSprites(animation, renderPosition, thing, spriteBatches);
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
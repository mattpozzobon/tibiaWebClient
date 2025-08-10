import Position from "../game/position";
import Tile from "../game/tile";
import Creature from "../game/creature";
import BoxAnimation from "../utils/box-animation";
import Animation from "../utils/animation";
import DistanceAnimation from "../utils/distance-animation";
import FrameGroup from "../utils/frame-group";
import Interface from "../ui/interface";
import { BatchSprite } from "../types/types";

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
    spriteBatches: Map<string, BatchSprite[]>
  ): void {
    if (!animation || !animation.getSprite || !spriteBatches) {
      return;
    }
    
    // Clip animations outside the visible screen area (same as tile sprites)
    const xCell = screenPos.x, yCell = screenPos.y;
    if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) {
      return;
    }
    
    // Get the frame group to check dimensions
    const frameGroup = animation.getFrameGroup(FrameGroup.NONE);
    const frame = animation.getFrame();
    const pattern = animation.getPattern();
    
    // Handle multi-tile animations like tiles and items
    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {

          const spriteIndex = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, x, y);
          const texture = frameGroup.getSprite(spriteIndex);
          
          if (!texture) continue;
          
          // Add to sprite batches for rendering
          const textureKey = texture.baseTexture.uid.toString();
          let batch = spriteBatches.get(textureKey);
          
          if (!batch) {
            batch = [];
            spriteBatches.set(textureKey, batch);
          }
          
          // Calculate pixel coordinates for this piece
          const pixelX = (screenPos.x - x) * 32;
          const pixelY = (screenPos.y - y) * 32;
          
          batch.push({
            sprite: { texture: texture },
            x: pixelX,
            y: pixelY,
            width: 32,
            height: 32
          });
        
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
        return;
      }
      
      const animation = new DistanceAnimation(animationId, packet.from, packet.to);
      this.animationLayers[packet.from.z % 8].add(animation);
    } catch (error) {
      console.error('addDistanceAnimation: error creating distance animation', error);
    }
  }

  /**
   * Test method to manually add distance animations for testing
   */
  public addTestDistanceAnimations(): void {
    const minX = 50, maxX = 76;
    const minY = 53, maxY = 65;
    const floor = 9;
  
    // Calculate center tile
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);
  
    let animationType = 1;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Skip the center tile itself
        if (x === centerX && y === centerY) continue;
  
        this.addDistanceAnimation({
          type: animationType,
          from: new Position(centerX, centerY, floor),
          to: new Position(x, y, floor)
        });
  
        animationType++;
        if (animationType > 15) animationType = 1; // cycle types 1-15
      }
    }
  }
  
  

  /**
   * Test method to manually add tile animations for testing
   */
  public addTestTileAnimations(): void {
    const minX = 50, maxX = 76;
    const minY = 53, maxY = 65;
    const floor = 9;
  
    let animationType = 1;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        this.addPositionAnimation({
          position: new Position(x, y, floor),
          type: animationType
        });
  
        animationType++;
        if (animationType > 10) animationType = 1; // cycle types 1-10
      }
    }
  }
  

  /**
   * Render a general animation
   */
  public renderAnimation(
    animation: any, 
    thing: any, 
    spriteBatches: Map<string, BatchSprite[]>,
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
    spriteBatches: Map<string, BatchSprite[]>,
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
    spriteBatches: Map<string, BatchSprite[]>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    // Renders a distance animation on a tile
    if (animation.expired()) {
      thing.delete(animation);
      return;
    }
    
    // Calculate interpolated position like the old renderer
    const fraction = animation.getFraction();
    
    // Cache screen position calculations to avoid repeated calls
    const fromPos = getStaticScreenPosition ? getStaticScreenPosition(animation.fromPosition) : animation.fromPosition;
    const toPos = getStaticScreenPosition ? getStaticScreenPosition(animation.toPosition) : animation.toPosition;
    
    // Calculate interpolated position without creating new Position object
    const renderX = fromPos.x + fraction * (toPos.x - fromPos.x);
    const renderY = fromPos.y + fraction * (toPos.y - fromPos.y);
    
    // Create position object only once
    const renderPosition = new Position(renderX, renderY, 0);
    
    // Collect sprites for the interpolated position
    this.collectAnimationSprites(animation, renderPosition, thing, spriteBatches);
  }

  /**
   * Render creature animations above the creature
   */
  public renderCreatureAnimationsAbove(
    creature: any, 
    spriteBatches: Map<string, BatchSprite[]>,
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
    spriteBatches: Map<string, BatchSprite[]>,
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
    const chunk = window.gameClient.world.getChunkFromWorldPosition(tile.getPosition());
    if (!chunk) {
      // If chunk is null, render light anyway
      this.renderLightThing(position, thing, intensity);
      return;
    }
    
    const floor = chunk.getFirstFloorFromBottomProjected(tile.getPosition());
  
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
import { Texture } from "pixi.js";
import Creature from "../game/creature";
import Position from "../game/position";
import { CharacterFrames } from "./creature-renderer-helper";
import SpriteBuffer from "./sprite-buffer";
import AnimationRenderer from "./animation-renderer";

const RENDER_LAYERS = [
  { groupKey: "characterGroup", frameKey: "characterFrame", hasMask: false },
  { groupKey: "bodyGroup", frameKey: "bodyFrame", hasMask: true },
  { groupKey: "legsGroup", frameKey: "legsFrame", hasMask: true },
  { groupKey: "feetGroup", frameKey: "feetFrame", hasMask: true },
  { groupKey: "leftHandGroup", frameKey: "leftHandFrame", hasMask: false },
  { groupKey: "rightHandGroup", frameKey: "rightHandFrame", hasMask: false },
  { groupKey: "headGroup", frameKey: "headFrame", hasMask: true },
  { groupKey: "hairGroup", frameKey: "hairFrame", hasMask: true, condition: "!frames.headGroup" }
];

export default class CreatureRenderer {
  // Performance optimizations
  private textureCache: Map<number, Texture | null> = new Map();
  private positionCache: Map<string, Position> = new Map();
  private animationRenderer: AnimationRenderer;

  constructor() {
    // No longer need sprite pool parameters since we use batching
    this.animationRenderer = new AnimationRenderer();
  }

  /**
   * Cached texture lookup to reduce spriteBuffer.get calls
   */
  private getCachedTexture(spriteId: number): Texture | null {
    if (this.textureCache.has(spriteId)) {
      return this.textureCache.get(spriteId)!;
    }
    
    const texture = window.gameClient.spriteBuffer.get(spriteId);
    this.textureCache.set(spriteId, texture);
    return texture;
  }

  /**
   * Cached position calculation to reduce object creation
   */
  private getCachedPosition(basePosition: Position, x: number, y: number, size: number): Position {
    const key = `${basePosition.x},${basePosition.y},${x},${y},${size}`;
    
    if (this.positionCache.has(key)) {
      return this.positionCache.get(key)!;
    }
    
    const position = new Position(
      Math.round((basePosition.x - x) * size),
      Math.round((basePosition.y - y) * size),
      0
    );
    this.positionCache.set(key, position);
    return position;
  }

  /**
   * Clear texture cache to force regeneration of sprites (used when outfit changes)
   */
  public clearTextureCache(): void {
    this.textureCache.clear();
    this.positionCache.clear();
    // Note: Hair changes require outfit changes to be processed by the server
    // The sprite buffer will naturally regenerate composed outfits on next render
  }

  /**
   * Simple hash function for string keys
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Collect sprites for batching instead of rendering immediately
   */
  public collectSprites(creature: Creature, position: Position, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>, size: number = 32, offset: number = 0.25): void {
    const frames: CharacterFrames | null = creature.renderer.getCharacterFrames();
    if (!frames) return;

    const xPattern = creature.getLookDirection() % 4;
    const zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);
    
    // Render each layer with optimized batching
    for (const layer of RENDER_LAYERS) {
      const group = frames[layer.groupKey as keyof CharacterFrames];
      const frame = frames[layer.frameKey as keyof CharacterFrames];
      
      // Skip if group doesn't exist or frame is undefined
      if (!group || frame === undefined) continue;
      
      // Skip hair if head group exists (condition check)
      if (layer.condition && layer.condition === "!frames.headGroup" && frames.headGroup) continue;
      
      this.collectLayerSprites(
        group, 
        frame, 
        xPattern, 
        zPattern, 
        drawPosition, 
        size, 
        spriteBatches, 
        layer.hasMask, 
        creature
      );
    }
  }

  /**
   * Collect creature animation sprites above the creature
   */
  public collectAnimationSpritesAbove(
    creature: Creature, 
    spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    this.animationRenderer.renderCreatureAnimationsAbove(creature, spriteBatches, getCreatureScreenPosition);
  }

  /**
   * Collect creature animation sprites below the creature
   */
  public collectAnimationSpritesBelow(
    creature: Creature, 
    spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    this.animationRenderer.renderCreatureAnimationsBelow(creature, spriteBatches, getCreatureScreenPosition);
  }
  
  /**
   * Collect layer sprites for batching with mask support
   */
  private collectLayerSprites(
    group: any, 
    frame: number, 
    xPattern: number, 
    zPattern: number, 
    position: Position, 
    size: number, 
    spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    hasMask: boolean = false,
    creature?: Creature
  ): void {
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        if (!spriteId) continue;
        
        let texture: Texture | null = null;
        
        // Handle masked sprites for outfit coloring
        if (hasMask && creature) {
          // Generate the correct composed key that includes all pattern information
          const composedKey = SpriteBuffer.getComposedKey(
            creature.outfit,
            group,
            frame,
            xPattern,
            0, // yPattern
            zPattern,
            x,
            y,
            creature.id // Pass creature ID for unique masks per player
          );
          
          // Convert string key to hash for texture lookup
          const hashKey = this.hashString(composedKey);
          
          // Check if we need to compose the outfit with mask
          if (!window.gameClient.spriteBuffer.has(hashKey)) {
            // Create composed outfit with mask
            window.gameClient.spriteBuffer.addComposedOutfit(
              composedKey, 
              creature.outfit, 
              group, 
              frame, 
              xPattern, 
              0, // yPattern 
              zPattern, 
              x, 
              y,
              creature.id // Pass creature ID for unique masks per player
            );
          }
          texture = this.getCachedTexture(hashKey);
        } else {
          // Regular sprite without mask
          texture = this.getCachedTexture(spriteId);
        }
        
        if (!texture) continue;
        
        // Use cached position calculation
        const spritePosition = this.getCachedPosition(position, x, y, size);
        
        const textureKey = texture.baseTexture.uid.toString();
        if (!spriteBatches.has(textureKey)) {
          spriteBatches.set(textureKey, []);
        }
        spriteBatches.get(textureKey)!.push({
          sprite: { texture: texture as any },
          x: spritePosition.x,
          y: spritePosition.y,
          width: 32,
          height: 32
        });
      }
    }
  }
}

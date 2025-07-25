import { Texture } from "pixi.js";
import Creature from "../game/creature";
import Position from "../game/position";
import { CharacterFrames } from "./creature-renderer-helper";

const RENDER_LAYERS = [
  { groupKey: "characterGroup", frameKey: "characterFrame" },
  { groupKey: "headGroup",      frameKey: "headFrame"      },
  { groupKey: "hairGroup",      frameKey: "hairFrame"      }
];

export default class CreatureRenderer {
  // Performance optimizations
  private textureCache: Map<number, Texture | null> = new Map();
  private positionCache: Map<string, Position> = new Map();

  constructor() {
    // No longer need sprite pool parameters since we use batching
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
      if (group && frame !== undefined) {
        this.collectLayerSprites(group, frame, xPattern, zPattern, drawPosition, size, spriteBatches);
      }
    }
  }
  
  /**
   * Collect layer sprites for batching
   */
  private collectLayerSprites(group: any, frame: number, xPattern: number, zPattern: number, position: Position, size: number, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        if (!spriteId) continue;
        
        // Use cached texture lookup
        const texture = this.getCachedTexture(spriteId);
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

import { Sprite, Texture } from "pixi.js";
import Creature from "../game/creature";
import Position from "../game/position";
import { CharacterFrames } from "./creature-renderer-helper";

const RENDER_LAYERS = [
  { groupKey: "characterGroup", frameKey: "characterFrame" },
  { groupKey: "headGroup",      frameKey: "headFrame"      },
  { groupKey: "hairGroup",      frameKey: "hairFrame"      }
];

export default class CreatureRenderer {
  private spritePool: Sprite[];
  private getPoolIndex: () => number;
  private setPoolIndex: (v: number) => void;
  private poolSize: number;
  
  // Performance optimizations
  private textureCache: Map<number, Texture | null> = new Map();
  private positionCache: Map<string, Position> = new Map();
  private lastFrame = 0;
  private currentTextureKey = '';
  private batchCount = 0;
  // Performance monitoring
  private renderTime = 0;
  private textureCacheHits = 0;
  private textureCacheMisses = 0;
  private positionCacheHits = 0;
  private positionCacheMisses = 0;
  private frameCount = 0;
  private lastResetFrame = 0;

  constructor(spritePool: Sprite[], getPoolIndex: () => number, setPoolIndex: (v: number) => void, poolSize: number) {
    this.spritePool = spritePool;
    this.getPoolIndex = getPoolIndex;
    this.setPoolIndex = setPoolIndex;
    this.poolSize = poolSize;
  }

  public render(creature: Creature, position: Position, size: number = 32, offset: number = 0.25): void {
    const startTime = performance.now();
    
    const frames: CharacterFrames | null = creature.renderer.getCharacterFrames();
    if (!frames) return;

    const xPattern = creature.getLookDirection() % 4;
    const zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);
    
    // Debug: Log when render is called
    if (this.frameCount % 60 === 0) {
      console.log(`CreatureRenderer.render called for creature ${creature.id}, frame ${this.frameCount}`);
    }
    
    // Clear caches periodically to prevent memory leaks
    const currentFrame = window.gameClient.renderer.debugger.__nFrames;
    if (currentFrame - this.lastFrame > 300) {
      this.textureCache.clear();
      this.positionCache.clear();
      this.lastFrame = currentFrame;
    }
    
    // Reset batching stats for this creature
    this.currentTextureKey = '';
    this.batchCount = 0;
    
    // Render each layer with optimized batching
    for (const layer of RENDER_LAYERS) {
      const group = frames[layer.groupKey as keyof CharacterFrames];
      const frame = frames[layer.frameKey as keyof CharacterFrames];
      if (group && frame !== undefined) {
        this.renderLayerOptimized(group, frame, xPattern, zPattern, drawPosition, size);
      }
    }
    
    // Performance monitoring
    this.renderTime += performance.now() - startTime;
    this.frameCount++;
    
    // Reset cache hit counters every 300 frames to prevent overflow
    if (currentFrame - this.lastResetFrame > 300) {
      this.textureCacheHits = 0;
      this.textureCacheMisses = 0;
      this.positionCacheHits = 0;
      this.positionCacheMisses = 0;
      this.lastResetFrame = currentFrame;
    }
  }

  /**
   * Optimized layer rendering with texture batching
   */
  private renderLayerOptimized(group: any, frame: number, xPattern: number, zPattern: number, position: Position, size: number): void {
    let poolIndex = this.getPoolIndex();
    
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        if (poolIndex >= this.poolSize) break;
        
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        if (!spriteId) continue;
        
        // Use cached texture lookup
        const texture = this.getCachedTexture(spriteId);
        if (!texture) continue;

        // Track texture switches for batching
        const textureKey = texture.baseTexture.uid.toString();
        if (textureKey !== this.currentTextureKey) {
          window.gameClient.renderer.textureSwitches++;
          this.currentTextureKey = textureKey;
          this.batchCount++;
        }
        
        // Use cached position calculation
        const spritePosition = this.getCachedPosition(position, x, y, size);
        
        const spr = this.spritePool[poolIndex++];
        spr.texture = texture as any;
        spr.x = spritePosition.x;
        spr.y = spritePosition.y;
        spr.width = 32;
        spr.height = 32;
        spr.visible = true;
        window.gameClient.renderer.drawCalls++;
      }
    }
    
    window.gameClient.renderer.batchCount += this.batchCount;
    this.setPoolIndex(poolIndex);
  }

  /**
   * Cached texture lookup to reduce spriteBuffer.get calls
   */
  private getCachedTexture(spriteId: number): Texture | null {
    if (this.textureCache.has(spriteId)) {
      this.textureCacheHits++;
      return this.textureCache.get(spriteId)!;
    }
    
    this.textureCacheMisses++;
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
      this.positionCacheHits++;
      return this.positionCache.get(key)!;
    }
    
    this.positionCacheMisses++;
    const position = new Position(
      Math.round((basePosition.x - x) * size),
      Math.round((basePosition.y - y) * size),
      0
    );
    this.positionCache.set(key, position);
    return position;
  }
  
  /**
   * Reset performance statistics manually
   */
  public resetPerformanceStats(): void {
    this.renderTime = 0;
    this.frameCount = 0;
    this.textureCacheHits = 0;
    this.textureCacheMisses = 0;
    this.positionCacheHits = 0;
    this.positionCacheMisses = 0;
    this.lastResetFrame = window.gameClient.renderer.debugger.__nFrames;
  }
  
  /**
   * Get performance statistics for debugging
   */
  public getPerformanceStats(): {
    avgRenderTime: number;
    textureCacheHitRate: number;
    positionCacheHitRate: number;
    textureCacheSize: number;
    positionCacheSize: number;
  } {
    const totalTextureLookups = this.textureCacheHits + this.textureCacheMisses;
    const totalPositionLookups = this.positionCacheHits + this.positionCacheMisses;
    
    return {
      avgRenderTime: this.frameCount > 0 ? (this.renderTime / this.frameCount * 1000) : 0,
      textureCacheHitRate: totalTextureLookups > 0 ? (this.textureCacheHits / totalTextureLookups * 100) : 0,
      positionCacheHitRate: totalPositionLookups > 0 ? (this.positionCacheHits / totalPositionLookups * 100) : 0,
      textureCacheSize: this.textureCache.size,
      positionCacheSize: this.positionCache.size,
    };
  }
}

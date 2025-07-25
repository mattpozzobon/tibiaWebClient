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
  // Batching optimization: group sprites by texture
  private textureGroups: Map<string, { sprites: Texture[], positions: Position[] }> = new Map();

  constructor(spritePool: Sprite[], getPoolIndex: () => number, setPoolIndex: (v: number) => void, poolSize: number) {
    this.spritePool = spritePool;
    this.getPoolIndex = getPoolIndex;
    this.setPoolIndex = setPoolIndex;
    this.poolSize = poolSize;
  }

  public render(creature: Creature, position: Position, size: number = 32, offset: number = 0.25): void {
    const frames: CharacterFrames | null = creature.renderer.getCharacterFrames();
    if (!frames) return;

    const xPattern = creature.getLookDirection() % 4;
    const zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);
    
    // Clear texture groups for this frame
    this.textureGroups.clear();
    
    // Collect all sprites by texture for batching
    for (const layer of RENDER_LAYERS) {
      const group = frames[layer.groupKey as keyof CharacterFrames];
      const frame = frames[layer.frameKey as keyof CharacterFrames];
      if (group && frame !== undefined) {
        this.collectLayerSprites(group, frame, xPattern, zPattern, drawPosition, size);
      }
    }
    
    // Render all sprites grouped by texture for optimal batching
    this.renderBatchedSprites();
  }

  /**
   * Collect sprites by texture to optimize batching
   */
  private collectLayerSprites(group: any, frame: number, xPattern: number, zPattern: number, position: Position, size: number): void {
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        if (!spriteId) continue;
        
        const texture = window.gameClient.spriteBuffer.get(spriteId);
        if (!texture) continue;

        const textureKey = texture.baseTexture.uid.toString();
        if (!this.textureGroups.has(textureKey)) {
          this.textureGroups.set(textureKey, { sprites: [], positions: [] });
        }
        
        const textureGroup = this.textureGroups.get(textureKey)!;
        textureGroup.sprites.push(texture);
        textureGroup.positions.push(new Position(
          Math.round((position.x - x) * size),
          Math.round((position.y - y) * size),
          0
        ));
      }
    }
  }

  /**
   * Render all sprites batched by texture for optimal performance
   */
  private renderBatchedSprites(): void {
    let poolIndex = this.getPoolIndex();
    
    // Render each texture group together
    for (const [textureKey, group] of this.textureGroups) {
      for (let i = 0; i < group.sprites.length; i++) {
        if (poolIndex >= this.poolSize) break;
        
        const spr = this.spritePool[poolIndex++];
        spr.texture = group.sprites[i] as any;
        spr.x = group.positions[i].x;
        spr.y = group.positions[i].y;
        spr.width = 32;
        spr.height = 32;
        spr.visible = true;
        window.gameClient.renderer.drawCalls++;
      }
    }
    
    this.setPoolIndex(poolIndex);
  }
}

import { Sprite } from "pixi.js";
import Creature from "../game/creature";
import Position from "../game/position";
import { CharacterFrames } from "./creature-renderer-helper";

export default class CreatureRenderer {
  private spritePool: Sprite[];
  private getPoolIndex: () => number;
  private setPoolIndex: (v: number) => void;
  private poolSize: number;

  constructor(spritePool: Sprite[], getPoolIndex: () => number, setPoolIndex: (v: number) => void, poolSize: number) {
    this.spritePool = spritePool;
    this.getPoolIndex = getPoolIndex;
    this.setPoolIndex = setPoolIndex;
    this.poolSize = poolSize;
  }


  /** Minimal draw: only draws the base outfit layer (main character sprite) */
  public render(creature: Creature, position: Position, size: number = 32, offset: number = 0.25): void {
    const frames: CharacterFrames | null = creature.renderer.getCharacterFrames();
    if (!frames) return;

    const xPattern = creature.getLookDirection() % 4;
    const zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);

    const group = frames.characterGroup;
    const frame = frames.characterFrame;

    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        console.log('spriteId', spriteId);
        if (!spriteId) continue;
        const texture = window.gameClient.spriteBuffer.get(spriteId);
        if (!texture) continue;

        let poolIndex = this.getPoolIndex();
        if (poolIndex < this.poolSize) {
          const spr = this.spritePool[poolIndex++];
          spr.texture = texture;
          spr.x = (drawPosition.x - x) * size;
          spr.y = (drawPosition.y - y) * size;
          spr.width = size;
          spr.height = size;
          spr.visible = true;
          this.setPoolIndex(poolIndex);
        }
      }
    }
  }
}

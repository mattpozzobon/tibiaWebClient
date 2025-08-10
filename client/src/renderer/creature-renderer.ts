import { Texture } from "pixi.js";
import Creature from "../game/creature";
import Position from "../game/position";
import { CharacterFrames } from "./creature-renderer-helper";
import SpriteBuffer from "./sprite-buffer";
import AnimationRenderer from "./animation-renderer";
import { CONST } from "../helper/appContext";

const RENDER_LAYERS = [
  { groupKey: "characterGroup", frameKey: "characterFrame", hasMask: false },
  { groupKey: "bodyGroup",  frameKey: "bodyFrame", hasMask: false },
  { groupKey: "legsGroup", frameKey: "legsFrame", hasMask: false },
  { groupKey: "feetGroup", frameKey: "feetFrame", hasMask: false },
  { groupKey: "leftHandGroup", frameKey: "leftHandFrame", hasMask: false },
  { groupKey: "rightHandGroup", frameKey: "rightHandFrame", hasMask: false },
  { groupKey: "headGroup", frameKey: "headFrame", hasMask: false },
  { groupKey: "hairGroup", frameKey: "hairFrame", hasMask: true, condition: "!frames.headGroup" }
];

export default class CreatureRenderer {
  private textureCache: Map<number, Texture | null> = new Map();
  private animationRenderer: AnimationRenderer;

  constructor() {
    this.animationRenderer = new AnimationRenderer();
  }

  private getCachedTexture(spriteId: number): Texture | null {
    if (this.textureCache.has(spriteId)) return this.textureCache.get(spriteId)!;
    const texture = window.gameClient.spriteBuffer.get(spriteId);
    this.textureCache.set(spriteId, texture);
    return texture;
  }

  public clearTextureCache(): void {
    this.textureCache.clear();
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  public collectSprites(
    creature: Creature,
    position: Position,
    spriteBatches: Map<number, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    size: number = 32,
    offset: number = 0.0
  ): void {
    const frames: CharacterFrames | null = creature.renderer.getCharacterFrames();
    if (!frames) return;

    const direction = creature.getLookDirection();
    let xPattern: number;
    switch (direction) {
      case CONST.DIRECTION.NORTHWEST:
      case CONST.DIRECTION.SOUTHWEST:
        xPattern = 3; // WEST
        break;
      case CONST.DIRECTION.NORTHEAST:
      case CONST.DIRECTION.SOUTHEAST:
        xPattern = 1; // EAST
        break;
      default:
        xPattern = direction % 4;
    }
    const zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;

    const baseX = position.x - offset;
    const baseY = position.y - offset;

    for (const layer of RENDER_LAYERS) {
      const group = frames[layer.groupKey as keyof CharacterFrames];
      const frame = frames[layer.frameKey as keyof CharacterFrames];
      if (!group || frame === undefined) continue;
      if (layer.condition && layer.condition === "!frames.headGroup" && frames.headGroup) continue;

      for (let x = 0; x < group.width; x++) {
        for (let y = 0; y < group.height; y++) {
          const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
          if (!spriteId) continue;

          let texture: Texture | null = null;

          if (layer.hasMask && creature) {
            const composedKey = SpriteBuffer.getComposedKey(creature.outfit, spriteId, group, frame, xPattern, 0, zPattern, x, y);
            const hashKey = this.hashString(composedKey);
            if (!window.gameClient.spriteBuffer.has(hashKey)) {
              const maskId = group.getSpriteId(frame, xPattern, 0, zPattern, 1, x, y);
              window.gameClient.spriteBuffer.addComposedOutfit(composedKey, creature.outfit, spriteId, maskId);
            }
            texture = window.gameClient.spriteBuffer.get(hashKey);
          } else {
            texture = this.getCachedTexture(spriteId);
          }
          if (!texture) continue;

          const key = (texture as any).source.uid as number;
          if (!spriteBatches.has(key)) spriteBatches.set(key, []);

          spriteBatches.get(key)!.push({
            sprite: { texture: texture as any },
            x: (baseX - x) * size,
            y: (baseY - y) * size,
            width: size,
            height: size
          });
        }
      }
    }
  }

  public collectAnimationSpritesAbove(creature: Creature, spriteBatches: Map<number, Array<{sprite: any, x: number, y: number, width: number, height: number}>>, getCreatureScreenPosition?: (creature: Creature) => Position): void {
    this.animationRenderer.renderCreatureAnimationsAbove(creature, spriteBatches as any, getCreatureScreenPosition);
  }

  public collectAnimationSpritesBelow(creature: Creature, spriteBatches: Map<number, Array<{sprite: any, x: number, y: number, width: number, height: number}>>, getCreatureScreenPosition?: (creature: Creature) => Position): void {
    this.animationRenderer.renderCreatureAnimationsBelow(creature, spriteBatches as any, getCreatureScreenPosition);
  }

  public shouldDefer(tile: any, creature: Creature): boolean {
    if (creature.renderer.getTeleported()) return false;
    if (!creature.isMoving()) return false;
    if (creature.getPosition().z !== creature.__previousPosition.z) return false;

    const dir = creature.getLookDirection();
    const prev = creature.__previousPosition;
    const tilePos = tile.getPosition();

    switch (dir) {
      case CONST.DIRECTION.NORTH:
      case CONST.DIRECTION.WEST:
      case CONST.DIRECTION.NORTHWEST:
      case CONST.DIRECTION.NORTHEAST:
      case CONST.DIRECTION.SOUTHWEST:
        if (!prev.equals(tilePos)) return true;
        break;
      default:
        break;
    }
    return false;
  }

  public defer(tile: any, creature: any): void {
    const deferTile = this.getDeferTile(tile, creature);
    if (deferTile !== null) deferTile.__deferredCreatures.add(creature);
  }

  public getDeferTile(tile: any, creature: any): any {
    const dir = creature.getLookDirection();
    const pos = creature.getPosition();
    switch (dir) {
      case CONST.DIRECTION.NORTHEAST: return window.gameClient.world.getTileFromWorldPosition(pos.south());
      case CONST.DIRECTION.SOUTHWEST: return window.gameClient.world.getTileFromWorldPosition(pos.east());
      case CONST.DIRECTION.SOUTHEAST: return window.gameClient.world.getTileFromWorldPosition(pos.north().west());
      case CONST.DIRECTION.SOUTH:     return window.gameClient.world.getTileFromWorldPosition(pos.north());
      case CONST.DIRECTION.EAST:      return window.gameClient.world.getTileFromWorldPosition(pos.west());
      default:                        return window.gameClient.world.getTileFromWorldPosition(creature.__previousPosition);
    }
  }

  public renderDeferred(tile: any, spriteBatches: Map<number, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    if (tile.__deferredCreatures.size === 0) return;
    tile.__deferredCreatures.forEach((creature: any) => {
      const tileFromWorld = window.gameClient.world.getTileFromWorldPosition(creature.vitals.position);
      if (tileFromWorld) {
        const screenPos = window.gameClient.renderer.getCreatureScreenPosition(creature);
        this.collectSprites(creature, screenPos, spriteBatches, 32, 0.0);
        this.collectAnimationSpritesBelow(creature, spriteBatches, window.gameClient.renderer.getCreatureScreenPosition.bind(window.gameClient.renderer));
        this.collectAnimationSpritesAbove(creature, spriteBatches, window.gameClient.renderer.getCreatureScreenPosition.bind(window.gameClient.renderer));
      }
    });
    tile.__deferredCreatures.clear();
  }
}

import { Texture } from "pixi.js";
import Creature from "../game/creature";
import Position from "../game/position";
import { CharacterFrames } from "./creature-renderer-helper";
import SpriteBuffer from "./sprite-buffer";
import AnimationRenderer from "./animation-renderer";
import { CONST } from "../helper/appContext";
import SpriteBatcher from "./sprite-batcher";
import Interface from "../ui/interface";
import LightRenderer from "./light-renderer";

const RENDER_LAYERS = [
  { groupKey: "characterGroup", frameKey: "characterFrame", hasMask: false },
  { groupKey: "bodyGroup",      frameKey: "bodyFrame",      hasMask: false },
  { groupKey: "legsGroup",      frameKey: "legsFrame",      hasMask: false },
  { groupKey: "feetGroup",      frameKey: "feetFrame",      hasMask: false },
  { groupKey: "backpackGroup",  frameKey: "backpackFrame",  hasMask: false },
  { groupKey: "beltGroup",      frameKey: "beltFrame",      hasMask: false },
  { groupKey: "headGroup",      frameKey: "headFrame",      hasMask: false },
  { groupKey: "hairGroup",      frameKey: "hairFrame",      hasMask: true,  condition: "!frames.headGroup" },
  { groupKey: "leftHandGroup",  frameKey: "leftHandFrame",  hasMask: false },
  { groupKey: "rightHandGroup", frameKey: "rightHandFrame", hasMask: false },
  { groupKey: "healthPotionGroup", frameKey: "healthPotionFrame", hasMask: false },
  { groupKey: "manaPotionGroup",   frameKey: "manaPotionFrame",   hasMask: false },
  { groupKey: "energyPotionGroup", frameKey: "energyPotionFrame", hasMask: false },
  { groupKey: "bagGroup",          frameKey: "bagFrame",          hasMask: false },
];

// Preserve original order for non-special layers
const BASE_ORDER_INDEX: Record<string, number> = Object.fromEntries(
  RENDER_LAYERS.map((l, i) => [l.groupKey, i])
);

function isNorthWestSide(dir: number): boolean {
  return (
    dir === CONST.DIRECTION.NORTH ||
    dir === CONST.DIRECTION.WEST ||
    dir === CONST.DIRECTION.NORTHWEST ||
    dir === CONST.DIRECTION.SOUTHWEST
  );
}

function isSouthEastSide(dir: number): boolean {
  return (
    dir === CONST.DIRECTION.SOUTH ||
    dir === CONST.DIRECTION.EAST ||
    dir === CONST.DIRECTION.NORTHEAST ||
    dir === CONST.DIRECTION.SOUTHEAST
  );
}

// Absolute rank: lower = drawn earlier (further back)
function layerPriorityForDirection(groupKey: string, dir: number): number {
  if (isNorthWestSide(dir)) {
    if (groupKey === "leftHandGroup" || groupKey === "rightHandGroup" || groupKey === "beltGroup") return 1;
    if (groupKey === "backpackGroup") return 2;
    if (groupKey === "headGroup")     return 3;
    return 0; // default
  }
  if (isSouthEastSide(dir)) {
    if (groupKey === "backpackGroup") return 1;
    if (groupKey === "headGroup")     return 2;
    if (groupKey === "leftHandGroup" || groupKey === "rightHandGroup") return 3;
    return 0;
  }
  return 0;
}

export default class CreatureRenderer {
  private textureCache: Map<number, Texture | null> = new Map();
  private animationRenderer: AnimationRenderer;
  private light: LightRenderer;

  constructor(animationRenderer: AnimationRenderer, light: LightRenderer) {
    this.animationRenderer = animationRenderer;
    this.light = light;
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
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  public collectSprites(
    creature: Creature,
    position: Position,
    batcher: SpriteBatcher,
    size: number = Interface.TILE_SIZE,
    offset: number = 0.0
  ): void {
    const frames: CharacterFrames | null = creature.renderer.getCharacterFrames();
    if (!frames) return;

    const direction = creature.getLookDirection();
    let xPattern: number;
    switch (direction) {
      case CONST.DIRECTION.NORTHWEST: xPattern = 3; break;
      case CONST.DIRECTION.NORTHEAST: xPattern = 1; break;
      case CONST.DIRECTION.SOUTHWEST: xPattern = 3; break;
      case CONST.DIRECTION.SOUTHEAST: xPattern = 1; break;
      default: xPattern = direction % 4;
    }
    const zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);

    // Collect light bubbles from equipped items (similar to item light bubbles)
    try {
      const floorZ = creature.getPosition().z;
      const outfit: any = creature.outfit;
      const lightDataObjects: any[] = [];

      // Character base object can theoretically emit light
      const charObj = outfit.getDataObject && outfit.getDataObject();
      if (charObj?.properties?.light) lightDataObjects.push(charObj);

      // Helper to push if slot equipped and has light property
      const maybePushLight = (getterName: string, equipped: any) => {
        if (!equipped) return;
        const fn = (outfit as any)[getterName];
        if (typeof fn === 'function') {
          const obj = fn.call(outfit);
          if (obj?.properties?.light) lightDataObjects.push(obj);
        }
      };

      // Check common equipment slots
      maybePushLight('getHeadDataObject', outfit.equipment?.head && outfit.equipment.head !== 0);
      maybePushLight('getBodyDataObject', outfit.equipment?.body && outfit.equipment.body !== 0);
      maybePushLight('getLegsDataObject', outfit.equipment?.legs && outfit.equipment.legs !== 0);
      maybePushLight('getFeetDataObject', outfit.equipment?.feet && outfit.equipment.feet !== 0);
      maybePushLight('getLeftHandDataObject', outfit.equipment?.lefthand && outfit.equipment.lefthand !== 0);
      maybePushLight('getRightHandDataObject', outfit.equipment?.righthand && outfit.equipment.righthand !== 0);
      maybePushLight('getBackpackDataObject', outfit.equipment?.backpack && outfit.equipment.backpack !== 0);
      maybePushLight('getBeltDataObject', outfit.equipment?.belt && outfit.equipment.belt !== 0);

      for (const obj of lightDataObjects) {
        const info = obj.properties.light;
        this.light.addLightBubble(position.x, position.y, info.level, info.color, floorZ);
      }
    } catch (_) {
      // Fail-safe: do not break rendering if outfit API differs
    }

    // Sort layers with absolute rank first, then fallback to original index
    const orderedLayers = [...RENDER_LAYERS].sort((a, b) => {
      const ra = layerPriorityForDirection(a.groupKey, direction);
      const rb = layerPriorityForDirection(b.groupKey, direction);
      if (ra !== rb) return ra - rb;
      return BASE_ORDER_INDEX[a.groupKey] - BASE_ORDER_INDEX[b.groupKey];
    });

    for (const layer of orderedLayers) {
      const group = frames[layer.groupKey as keyof CharacterFrames];
      const frame = frames[layer.frameKey as keyof CharacterFrames];
      if (!group || frame === undefined) continue;
      if (layer.condition && layer.condition === "!frames.headGroup" && frames.headGroup) continue;

      this.collectLayerSprites(
        group, frame, xPattern, zPattern, drawPosition,
        size, batcher, layer.hasMask, creature
      );
    }
  }

  public collectAnimationSpritesAbove(
    creature: Creature,
    batcher: SpriteBatcher,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    this.animationRenderer.renderCreatureAnimationsAbove(creature, batcher, getCreatureScreenPosition);
  }

  public collectAnimationSpritesBelow(
    creature: Creature,
    batcher: SpriteBatcher,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    this.animationRenderer.renderCreatureAnimationsBelow(creature, batcher, getCreatureScreenPosition);
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

  public renderDeferred(tile: any, batcher: SpriteBatcher): void {
    if (tile.__deferredCreatures.size === 0) return;
    tile.__deferredCreatures.forEach((creature: any) => {
      const tileFromWorld = window.gameClient.world.getTileFromWorldPosition(creature.vitals.position);
      if (tileFromWorld) {
        const screenPos = window.gameClient.renderer.getCreatureScreenPosition(creature);
        this.collectSprites(creature, screenPos, batcher, Interface.TILE_SIZE, 0.0);
        this.collectAnimationSpritesBelow(creature, batcher,
          window.gameClient.renderer.getCreatureScreenPosition.bind(window.gameClient.renderer));
        this.collectAnimationSpritesAbove(creature, batcher,
          window.gameClient.renderer.getCreatureScreenPosition.bind(window.gameClient.renderer));
      }
    }, this);
    tile.__deferredCreatures.clear();
  }

  private collectLayerSprites(
    group: any,
    frame: number,
    xPattern: number,
    zPattern: number,
    position: Position,
    size: number,
    batcher: SpriteBatcher,
    hasMask: boolean = false,
    creature?: Creature
  ): void {
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        if (!spriteId) continue;

        let texture: Texture | null = null;
        if (hasMask && creature) {
          const composedKey = SpriteBuffer.getComposedKey(
            creature.outfit, spriteId, group, frame, xPattern, 0, zPattern, x, y
          );
          const hashKey = this.hashString(composedKey);
          if (!window.gameClient.spriteBuffer.has(hashKey)) {
            const maskId = group.getSpriteId(frame, xPattern, 0, zPattern, 1, x, y);
            window.gameClient.spriteBuffer.addComposedOutfit(
              composedKey, creature.outfit, spriteId, maskId
            );
          }
          texture = window.gameClient.spriteBuffer.get(hashKey);
        } else {
          texture = this.getCachedTexture(spriteId);
        }

        if (!texture) continue;

        const px = (position.x - x) * size;
        const py = (position.y - y) * size;

        batcher.push(texture, px, py, Interface.TILE_SIZE, Interface.TILE_SIZE, false);
      }
    }
  }
}

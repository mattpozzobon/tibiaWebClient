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

// Optimized render layers with pre-computed indices
const RENDER_LAYERS = [
  { groupKey: "characterGroup",     hasMask: false, index: 0 },
  { groupKey: "bodyGroup",          hasMask: false, index: 1 },
  { groupKey: "legsGroup",          hasMask: false, index: 2 },
  { groupKey: "feetGroup",          hasMask: false, index: 3 },
  { groupKey: "backpackGroup",      hasMask: false, index: 4 },
  { groupKey: "beltGroup",          hasMask: false, index: 5 },
  { groupKey: "headGroup",          hasMask: false, index: 6 },
  { groupKey: "hairGroup",          hasMask: true,  index: 7, condition: "!frames.headGroup" },
  { groupKey: "leftHandGroup",      hasMask: false, index: 8 },
  { groupKey: "rightHandGroup",     hasMask: false, index: 9 },
  { groupKey: "healthPotionGroup",  hasMask: false, index: 10 },
  { groupKey: "manaPotionGroup",    hasMask: false, index: 11 },
  { groupKey: "energyPotionGroup",  hasMask: false, index: 12 },
  { groupKey: "bagGroup",           hasMask: false, index: 13 },
] as const;

// Pre-computed direction lookups for better performance
const DIRECTION_PATTERNS = new Map([
  [CONST.DIRECTION.NORTH, 0],
  [CONST.DIRECTION.EAST,  1],
  [CONST.DIRECTION.SOUTH, 2],
  [CONST.DIRECTION.WEST,  3],
  [CONST.DIRECTION.NORTHWEST, 3],
  [CONST.DIRECTION.NORTHEAST, 1],
  [CONST.DIRECTION.SOUTHWEST, 3],
  [CONST.DIRECTION.SOUTHEAST, 1],
]);

// ---- Direction-aware ordering (hands vs backpack/bag) ----
const BASE_ORDER_INDEX: Record<string, number> = Object.fromEntries(
  RENDER_LAYERS.map((l, i) => [l.groupKey, i])
);

function facesNorthOrWest(dir: number): boolean {
  return (
    dir === CONST.DIRECTION.NORTH ||
    dir === CONST.DIRECTION.WEST ||
    dir === CONST.DIRECTION.NORTHWEST ||
    dir === CONST.DIRECTION.SOUTHWEST
  );
}

function facesSouthOrEast(dir: number): boolean {
  return (
    dir === CONST.DIRECTION.SOUTH ||
    dir === CONST.DIRECTION.EAST ||
    dir === CONST.DIRECTION.NORTHEAST ||
    dir === CONST.DIRECTION.SOUTHEAST
  );
}

/**
 * Absolute rank for special groups. Lower = drawn earlier (behind).
 * We only force order between hands and backpack/bag; others keep base order.
 */
function rankFor(dir: number, groupKey: string): number {
  const isHand = groupKey === "leftHandGroup" || groupKey === "rightHandGroup";
  const isBack = groupKey === "backpackGroup" || groupKey === "bagGroup";
  const isHeadOrHair = groupKey === "headGroup" || groupKey === "hairGroup";

  if (facesNorthOrWest(dir)) {
    if (isHand) return 1;        // hands behind back
    if (isBack) return 2;        // back behind head/hair
    if (isHeadOrHair) return 3;  // head/hair always above back
    return 0;
  }

  if (facesSouthOrEast(dir)) {
    if (isBack) return 1;        // back behind head/hair
    if (isHeadOrHair) return 2;  // head/hair above back
    if (isHand) return 3;        // hands on top
    return 0;
  }

  return 0;
}
// ---------------------------------------------------------

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
    const xPattern = DIRECTION_PATTERNS.get(direction) ?? (direction % 4);
    const zPattern = 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);

    // Collect light bubbles from equipped items (similar to item light bubbles)
    try {
      const floorZ = creature.getPosition().z;
      const outfit: any = creature.outfit;
      const lightDataObjects: any[] = [];

      const charObj = outfit.getDataObject && outfit.getDataObject();
      if (charObj?.properties?.light) lightDataObjects.push(charObj);

      const maybePushLight = (getterName: string, equipped: any) => {
        if (!equipped) return;
        const fn = (outfit as any)[getterName];
        if (typeof fn === 'function') {
          const obj = fn.call(outfit);
          if (obj?.properties?.light) lightDataObjects.push(obj);
        }
      };

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
      // fail-safe
    }

    const frame = frames.frame;
    if (frame === undefined) return;

    // Direction-aware ordering between hands and backpack/bag
    const orderedLayers = [...RENDER_LAYERS].sort((a, b) => {
      const ra = rankFor(direction, a.groupKey);
      const rb = rankFor(direction, b.groupKey);
      if (ra !== rb) return ra - rb;
      return BASE_ORDER_INDEX[a.groupKey] - BASE_ORDER_INDEX[b.groupKey];
    });

    for (const layer of orderedLayers) {
      const group = frames[layer.groupKey as keyof CharacterFrames];
      if (!group) continue;

      // Skip hair if head is present
      if ('condition' in layer && layer.condition === "!frames.headGroup" && frames.headGroup) continue;

      // Use individual frames for hand groups
      let currentFrame = frame;
      if (layer.groupKey === "leftHandGroup" && frames.leftHandFrame !== undefined) {
        currentFrame = frames.leftHandFrame;
      } else if (layer.groupKey === "rightHandGroup" && frames.rightHandFrame !== undefined) {
        currentFrame = frames.rightHandFrame;
      }

      this.collectLayerSprites(
        group, currentFrame, xPattern, zPattern, drawPosition,
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
    const { width, height } = group;
    const posX = position.x;
    const posY = position.y;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
        if (!spriteId) continue;

        let texture: Texture | null = null;
        if (hasMask && creature) {
          const composedKey = SpriteBuffer.getComposedKey(creature.outfit, spriteId, group, frame, xPattern, 0, zPattern, x, y);
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

        const px = (posX - x) * size;
        const py = (posY - y) * size;

        batcher.push(texture, px, py, Interface.TILE_SIZE, Interface.TILE_SIZE, false);
      }
    }
  }
}

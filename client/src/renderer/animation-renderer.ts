import Position from "../game/position";
import Tile from "../game/tile";
import Creature from "../game/creature";
import BoxAnimation from "../utils/box-animation";
import Animation from "../utils/animation";
import DistanceAnimation from "../utils/distance-animation";
import FrameGroup from "../utils/frame-group";
import Interface from "../ui/interface";
import SpriteBatcher from "./sprite-batcher";

export default class AnimationRenderer {
  animationLayers = new Array();

  constructor() {
    this.__createAnimationLayers();
  }

  private collectAnimationSprites(
    animation: any,
    screenPos: Position,
    _thing: any,
    batcher: SpriteBatcher
  ): void {
    const xCell = screenPos.x, yCell = screenPos.y;
    if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) return;

    const frameGroup = animation.getFrameGroup(FrameGroup.NONE);
    const frame = animation.getFrame();
    const pattern = animation.getPattern();

    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        const spriteIndex = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, x, y);
        const texture = frameGroup.getSprite(spriteIndex);
        if (!texture) continue;

        const pixelX = (screenPos.x - x) * Interface.TILE_SIZE;
        const pixelY = (screenPos.y - y) * Interface.TILE_SIZE;

        batcher.push(texture, pixelX, pixelY, Interface.TILE_SIZE, Interface.TILE_SIZE, false);
      }
    }
  }

  public __createAnimationLayers(): void {
    for (let i = 0; i < 8; i++) this.animationLayers.push(new Set());
  }

  public addPositionAnimation(packet: { position: Position; type: number }): any {
    const tile = window.gameClient.world.getTileFromWorldPosition(packet.position);
    if (tile === null) return;

    let animationId;
    try {
      animationId = window.gameClient.dataObjects.getAnimationId(packet.type);
    } catch {
      return;
    }
    if (animationId === null) return;

    const animation = new Animation(animationId);
    return tile.addAnimation(animation);
  }

  public addDistanceAnimation(packet: { type: number; from: Position; to: Position }): void {
    try {
      const animationId = window.gameClient.dataObjects.getDistanceAnimationId(packet.type);
      if (animationId === null) return;
      const animation = new DistanceAnimation(animationId, packet.from, packet.to);
      this.animationLayers[packet.from.z % 8].add(animation);
    } catch {
      // ignore
    }
  }

  public addTestDistanceAnimations(): void {
    const minX = 50, maxX = 76;
    const minY = 53, maxY = 65;
    const floor = 9;

    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);

    let animationType = 1;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (x === centerX && y === centerY) continue;
        this.addDistanceAnimation({
          type: animationType,
          from: new Position(centerX, centerY, floor),
          to: new Position(x, y, floor)
        });
        animationType = animationType % 15 + 1;
      }
    }
  }

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
        animationType = animationType % 10 + 1;
      }
    }
  }

  public renderAnimation(
    animation: any,
    thing: any,
    batcher: SpriteBatcher,
    getStaticScreenPosition?: (pos: Position) => Position,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    if (animation.expired()) {
      thing.deleteAnimation(animation);
      return;
    }

    // (lighting hook left as-is)

    let screenPos: Position;
    if (animation instanceof BoxAnimation) {
      screenPos = getCreatureScreenPosition ? getCreatureScreenPosition(thing) : new Position(0, 0, 0);
    } else if (thing instanceof Tile) {
      screenPos = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
      this.collectAnimationSprites(animation, screenPos, thing, batcher);
    } else if (thing instanceof Creature) {
      screenPos = getCreatureScreenPosition ? getCreatureScreenPosition(thing) : new Position(0, 0, 0);
      this.collectAnimationSprites(animation, screenPos, thing, batcher);
    } else if (thing instanceof DistanceAnimation) {
      screenPos = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
      this.collectAnimationSprites(animation, screenPos, thing, batcher);
    }
  }

  public renderTileAnimations(
    tile: Tile,
    batcher: SpriteBatcher,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    if (tile.__animations && tile.__animations.size > 0) {
      tile.__animations.forEach((animation: any) => {
        this.renderAnimation(animation, tile, batcher, getStaticScreenPosition);
      }, this);
    }
  }

  public renderDistanceAnimation(
    animation: any,
    thing: any,
    batcher: SpriteBatcher,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    if (animation.expired()) {
      thing.delete(animation);
      return;
    }

    const fraction = animation.getFraction();

    const fromPos = getStaticScreenPosition ? getStaticScreenPosition(animation.fromPosition) : animation.fromPosition;
    const toPos   = getStaticScreenPosition ? getStaticScreenPosition(animation.toPosition)   : animation.toPosition;

    const renderX = fromPos.x + fraction * (toPos.x - fromPos.x);
    const renderY = fromPos.y + fraction * (toPos.y - fromPos.y);

    this.collectAnimationSprites(animation, new Position(renderX, renderY, 0), thing, batcher);
  }

  public renderCreatureAnimationsAbove(
    creature: Creature,
    batcher: SpriteBatcher,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    if (creature.__animations && creature.__animations.entries.length > 0) {
      creature.__animations.forEach((animation: any) => {
        if (animation.constructor.name !== "BoxAnimation") {
          this.renderAnimation(animation, creature, batcher, undefined, getCreatureScreenPosition);
        }
      }, this);
    }
  }

  public renderCreatureAnimationsBelow(
    creature: Creature,
    batcher: SpriteBatcher,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    if (creature.__animations && creature.__animations.entries.length > 0) {
      creature.__animations.forEach((animation: any) => {
        if (animation.constructor.name === "BoxAnimation") {
          this.renderAnimation(animation, creature, batcher, undefined, getCreatureScreenPosition);
        }
      }, this);
    }
  }

  private renderLight(_tile: any, _position: Position, _thing: any, _intensity: any): void {
    // stub
  }

  private renderLightThing(_position: Position, _thing: any, _intensity: any): void {
    // stub
  }
}

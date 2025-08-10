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
  // per-floor distance animations
  public animationLayers: Array<Set<any>> = [];

  constructor() {
    this.__createAnimationLayers();
  }

  private collectAnimationSprites(
    animation: any,
    screenPos: Position,
    _thing: any,
    spriteBatches: Map<number, BatchSprite[]>
  ): void {
    if (!animation || !animation.getSprite || !spriteBatches) return;

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

        const key = texture.source.uid as number;
        let batch = spriteBatches.get(key);
        if (!batch) {
          batch = [];
          spriteBatches.set(key, batch);
        }

        batch.push({
          sprite: { texture },
          x: (screenPos.x - x) * Interface.TILE_SIZE,
          y: (screenPos.y - y) * Interface.TILE_SIZE,
          width: Interface.TILE_SIZE,
          height: Interface.TILE_SIZE
        });
      }
    }
  }

  public __createAnimationLayers(): void {
    for (let i = 0; i < 8; i++) this.animationLayers.push(new Set());
  }

  public addPositionAnimation(packet: { position: Position; type: number }): any {
    const tile = window.gameClient.world.getTileFromWorldPosition(packet.position);
    if (!tile) return;

    let animationId: number | null;
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
    } catch {}
  }

  // test helpers unchanged…

  public renderAnimation(
    animation: any,
    thing: any,
    spriteBatches: Map<number, BatchSprite[]>,
    getStaticScreenPosition?: (pos: Position) => Position,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    if (animation.expired()) {
      thing.deleteAnimation(animation);
      return;
    }

    if (!(animation instanceof BoxAnimation)) {
      if (window.gameClient.interface.settings.isLightingEnabled() && animation.isLight()) {
        const position = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
        this.renderLight(thing, position, animation, false);
      }
    }

    if (animation instanceof BoxAnimation) {
      // future: draw rect
      return;
    }

    let screenPos: Position;
    if (thing instanceof Tile) {
      screenPos = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
      this.collectAnimationSprites(animation, screenPos, thing, spriteBatches);
    } else if (thing instanceof Creature) {
      screenPos = getCreatureScreenPosition ? getCreatureScreenPosition(thing) : new Position(0, 0, 0);
      this.collectAnimationSprites(animation, screenPos, thing, spriteBatches);
    } else if (thing instanceof DistanceAnimation) {
      screenPos = getStaticScreenPosition ? getStaticScreenPosition(thing.getPosition()) : new Position(0, 0, 0);
      this.collectAnimationSprites(animation, screenPos, thing, spriteBatches);
    }
  }

  public renderTileAnimations(
    tile: any,
    spriteBatches: Map<number, BatchSprite[]>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    if (tile.__animations && tile.__animations.size > 0) {
      tile.__animations.forEach((animation: any) => {
        this.renderAnimation(animation, tile, spriteBatches, getStaticScreenPosition);
      });
    }
  }

  public renderDistanceAnimation(
    animation: any,
    thing: any,
    spriteBatches: Map<number, BatchSprite[]>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    if (animation.expired()) {
      thing.delete(animation);
      return;
    }

    const fraction = animation.getFraction();
    const fromPos = getStaticScreenPosition ? getStaticScreenPosition(animation.fromPosition) : animation.fromPosition;
    const toPos = getStaticScreenPosition ? getStaticScreenPosition(animation.toPosition) : animation.toPosition;

    const renderX = fromPos.x + fraction * (toPos.x - fromPos.x);
    const renderY = fromPos.y + fraction * (toPos.y - fromPos.y);

    const renderPosition = new Position(renderX, renderY, 0);
    this.collectAnimationSprites(animation, renderPosition, thing, spriteBatches);
  }

  public renderCreatureAnimationsAbove(
    creature: any,
    spriteBatches: Map<number, BatchSprite[]>,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    if (creature.__animations && creature.__animations.length > 0) {
      creature.__animations.forEach((animation: any) => {
        if (animation.constructor.name !== "BoxAnimation") {
          this.renderAnimation(animation, creature, spriteBatches, undefined, getCreatureScreenPosition);
        }
      });
    }
  }

  public renderCreatureAnimationsBelow(
    creature: any,
    spriteBatches: Map<number, BatchSprite[]>,
    getCreatureScreenPosition?: (creature: Creature) => Position
  ): void {
    if (creature.__animations && creature.__animations.length > 0) {
      creature.__animations.forEach((animation: any) => {
        if (animation.constructor.name === "BoxAnimation") {
          this.renderAnimation(animation, creature, spriteBatches, undefined, getCreatureScreenPosition);
        }
      });
    }
  }

  private renderLight(tile: any, position: Position, thing: any, _intensity: any): void {
    const chunk = window.gameClient.world.getChunkFromWorldPosition(tile.getPosition());
    if (!chunk) {
      this.renderLightThing(position, thing, _intensity);
      return;
    }
    const floor = chunk.getFirstFloorFromBottomProjected(tile.getPosition());
    if (floor === null || floor >= window.gameClient.player!.getMaxFloor()) {
      this.renderLightThing(position, thing, _intensity);
    }
  }

  private renderLightThing(position: Position, thing: any, _intensity: any): void {
    const info = thing.getDataObject().properties.light;
    const phase = 0;
    const _size =
      info.level + 0.2 * info.level * Math.sin(phase + window.gameClient.renderer.debugger.__nFrames / (8 * 2 * Math.PI));
    // draw light bubble here if/when you re-enable the light canvas
  }

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
}

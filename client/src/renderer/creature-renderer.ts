import { Texture } from "pixi.js";
import Creature, { CharacterFrames } from "../game/creature";
import Position from "../game/position";
import SpriteBuffer from "../renderer/sprite-buffer";
import FrameGroup from "../utils/frame-group";
import Sprite from "./sprite";

export default class CreatureRenderer {
  private creature: Creature;

  public spriteBuffer: SpriteBuffer;
  public spriteBufferMount?: SpriteBuffer;
  
  
  constructor(creature: Creature) {
    this.creature = creature;

    this.spriteBuffer = new SpriteBuffer(this.creature.outfit.getSpriteBufferSize(this.creature.outfit.getDataObject()));
    if (this.creature.outfit.getDataObjectMount()) {
      this.spriteBufferMount = new SpriteBuffer(this.creature.outfit.getSpriteBufferSize(this.creature.outfit.getDataObjectMount()));
    }
  }
  
  protected __getWalkingFrame(frameGroup: any): number {
    // Calculate walking frame based on remaining movement fraction.
    return Math.round((1 - this.creature.getMovingFraction()) * (frameGroup.animationLength - 1));
  }

  public getCharacterFrames(): CharacterFrames | null {
    const characterObject = this.creature.outfit.getDataObject();
    const mountObject = this.creature.outfit.getDataObjectMount();

    const headObject = this.creature.outfit.equipment.head !== 0 ? this.creature.outfit.getHeadDataObject() : null;
    const bodyObject = this.creature.outfit.equipment.body !== 0 ? this.creature.outfit.getBodyDataObject() : null;
    const legsObject = this.creature.outfit.equipment.legs !== 0 ? this.creature.outfit.getLegsDataObject() : null;
    const feetObject = this.creature.outfit.equipment.feet !== 0 ? this.creature.outfit.getFeetDataObject() : null;

    const leftHandObject = this.creature.outfit.equipment.lefthand !== 0 ? this.creature.outfit.getLeftHandDataObject() : null;
    const rightHandObject = this.creature.outfit.equipment.righthand !== 0 ? this.creature.outfit.getRightHandDataObject() : null;

    let hairObject: any = null;
      if (this.creature.outfit.equipment.head === 0) {
      hairObject = this.creature.outfit.getHairDataObject();
    }

    if (characterObject === null) {
      return null;
    }

    let characterGroup: any, mountGroup: any, characterFrame: number, mountFrame: number;
    let headGroup: any, bodyGroup: any, legsGroup: any, feetGroup: any, hairGroup: any;
    let leftHandGroup: any, rightHandGroup: any, leftHandFrame: number, rightHandFrame: number;
    let headFrame: number, bodyFrame: number, legsFrame: number, feetFrame: number, hairFrame: number;
    let isMoving: boolean;

    if (!this.creature.isMoving()) {
      isMoving = false;
      characterGroup = characterObject.getFrameGroup(FrameGroup.GROUP_IDLE);
      characterFrame = (characterObject.frameGroups.length === 1 && !characterObject.isAlwaysAnimated())
        ? 0
        : characterGroup.getAlwaysAnimatedFrame();

      headGroup = headObject ? headObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;
      bodyGroup = bodyObject ? bodyObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;
      legsGroup = legsObject ? legsObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;
      feetGroup = feetObject ? feetObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;
      hairGroup = hairObject ? hairObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;

      headFrame = headGroup ? headGroup.getAlwaysAnimatedFrame() : 0;
      bodyFrame = bodyGroup ? bodyGroup.getAlwaysAnimatedFrame() : 0;
      legsFrame = legsGroup ? legsGroup.getAlwaysAnimatedFrame() : 0;
      feetFrame = feetGroup ? feetGroup.getAlwaysAnimatedFrame() : 0;
      hairFrame = hairGroup ? hairGroup.getAlwaysAnimatedFrame() : 0;

      leftHandGroup = leftHandObject ? leftHandObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;
      rightHandGroup = rightHandObject ? rightHandObject.getFrameGroup(FrameGroup.GROUP_IDLE) : null;
      leftHandFrame = leftHandGroup ? leftHandGroup.getAlwaysAnimatedFrame() : 0;
      rightHandFrame = rightHandGroup ? rightHandGroup.getAlwaysAnimatedFrame() : 0;

      if (window.gameClient.clientVersion === 1098) {
        mountGroup = mountObject.getFrameGroup(FrameGroup.GROUP_IDLE);
        mountFrame = mountGroup.getAlwaysAnimatedFrame();
      } else {
        mountGroup = 0;
        mountFrame = 0;
      }
    } else {
      isMoving = true;
      characterGroup = characterObject.getFrameGroup(FrameGroup.GROUP_MOVING);
      characterFrame = this.__getWalkingFrame(characterGroup);

      headGroup = headObject ? headObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;
      bodyGroup = bodyObject ? bodyObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;
      legsGroup = legsObject ? legsObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;
      feetGroup = feetObject ? feetObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;
      hairGroup = hairObject ? hairObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;

      headFrame = headGroup ? this.__getWalkingFrame(headGroup) : 0;
      bodyFrame = bodyGroup ? this.__getWalkingFrame(bodyGroup) : 0;
      legsFrame = legsGroup ? this.__getWalkingFrame(legsGroup) : 0;
      feetFrame = feetGroup ? this.__getWalkingFrame(feetGroup) : 0;
      hairFrame = hairGroup ? this.__getWalkingFrame(hairGroup) : 0;

      leftHandGroup = leftHandObject ? leftHandObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;
      rightHandGroup = rightHandObject ? rightHandObject.getFrameGroup(FrameGroup.GROUP_MOVING) : null;
      leftHandFrame = leftHandGroup ? this.__getWalkingFrame(leftHandGroup) : 0;
      rightHandFrame = rightHandGroup ? this.__getWalkingFrame(rightHandGroup) : 0;

      if (window.gameClient.clientVersion === 1098) {
        mountGroup = mountObject.getFrameGroup(FrameGroup.GROUP_MOVING);
        mountFrame = this.__getWalkingFrame(mountGroup);
      } else {
        mountGroup = 0;
        mountFrame = 0;
      }
    }

      return {
        characterGroup,
        mountGroup,
        characterFrame,
        mountFrame,
        headGroup,
        bodyGroup,
        legsGroup,
        feetGroup,
        hairGroup,
        leftHandGroup,
        rightHandGroup,
        headFrame,
        bodyFrame,
        legsFrame,
        feetFrame,
        hairFrame,
        leftHandFrame,
        rightHandFrame,
        isMoving,
      };
  }

  public draw(position: Position, size: number = 32, offset: number = 0.25): void {
    const frames: CharacterFrames | null = this.getCharacterFrames();
    if (!frames) return;

    const xPattern = this.creature.getLookDirection() % 4;
    const zPattern = frames.characterGroup.pattern.z > 1 && this.creature.isMounted() ? 1 : 0;
    const drawPosition = new Position(position.x - offset, position.y - offset, 0);

    const LAYERS = [
      { group: frames.characterGroup, frame: frames.characterFrame, buffer: this.spriteBuffer },
      { group: frames.bodyGroup, frame: frames.bodyFrame },
      { group: frames.legsGroup, frame: frames.legsFrame },
      { group: frames.feetGroup, frame: frames.feetFrame },
      { group: frames.leftHandGroup, frame: frames.leftHandFrame },
      { group: frames.rightHandGroup, frame: frames.rightHandFrame },
      { group: frames.headGroup, frame: frames.headFrame },
      { group: frames.hairGroup, frame: frames.hairFrame, condition: !frames.headGroup, hasMask: true },
    ];

    for (const layer of LAYERS) {
      if (!layer.group || layer.frame === undefined) continue;
      if (layer.condition === false) continue;

      const buffer = layer.buffer || new SpriteBuffer(64);
      this.drawLayer(buffer, layer.group, layer.frame, xPattern, zPattern, drawPosition, size, 0, layer.hasMask || false);
    }
  }

  private drawLayer(
    spriteBuffer: SpriteBuffer,
    group: any,
    frame: number,
    xPattern: number,
    zPattern: number,
    position: Position,
    size: number,
    yPattern: number,
    hasMask: boolean = false
  ): void {
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        const spriteId = group.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
        if (spriteId === 0) continue;

        if (hasMask && !spriteBuffer.has(spriteId)) {
          //spriteBuffer.addComposedOutfit(spriteId, this.creature.outfit, group, frame, xPattern, zPattern, x, y);
        }

        let sprite: Texture | null = null;
        try {
          sprite = spriteBuffer.get(spriteId);
        } catch (err) {
          console.error("CreatureRenderer sprite error", err);
        }

        window.gameClient.renderer.screen.__drawSprite(sprite, position, x, y, size);
      }
    }
  }
}

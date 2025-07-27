import Creature from "../game/creature";
import FrameGroup from "../utils/frame-group";

export interface CharacterFrames {
  characterGroup: any; characterFrame: number;
  bodyGroup?: any;     bodyFrame?: number;
  legsGroup?: any;     legsFrame?: number;
  feetGroup?: any;     feetFrame?: number;
  leftHandGroup?: any; leftHandFrame?: number;
  rightHandGroup?: any; rightHandFrame?: number;
  hairGroup?: any;     hairFrame?: number;
  headGroup?: any;     headFrame?: number;
  isMoving: boolean;
}

export default class CreatureRendererHelper {
  private creature: Creature;

  constructor(creature: Creature) {
    this.creature = creature;
  }

  protected __getWalkingFrame(frameGroup: any): number {
    if (!frameGroup) return 0;
    // Clamp movingFraction to [0,1] for safety
    const f = Math.max(0, Math.min(1, this.creature.getMovingFraction()));
    return Math.round((1 - f) * (frameGroup.animationLength - 1));
  }

  public getCharacterFrames(): CharacterFrames | null {
    const outfit = this.creature.outfit;
    const characterObject = outfit.getDataObject();
    if (!characterObject) return null;

    const isMoving = this.creature.isMoving();
    const groupType = isMoving ? FrameGroup.GROUP_MOVING : FrameGroup.GROUP_IDLE;

    // --- Base Character (body) ---
    const characterGroup = characterObject.getFrameGroup(groupType);
    const characterFrame = isMoving ? this.__getWalkingFrame(characterGroup) : ((characterObject.frameGroups.length === 1 && !characterObject.isAlwaysAnimated()) ? 0 : characterGroup.getAlwaysAnimatedFrame());

    // --- Body equipment ---
    let bodyGroup = null, bodyFrame = 0;
    if (outfit.equipment?.body && outfit.equipment.body !== 0) {
      const bodyObject = outfit.getBodyDataObject && outfit.getBodyDataObject();
      if (bodyObject) {
        bodyGroup = bodyObject.getFrameGroup(groupType);
        bodyFrame = isMoving
          ? this.__getWalkingFrame(bodyGroup)
          : (bodyGroup.getAlwaysAnimatedFrame ? bodyGroup.getAlwaysAnimatedFrame() : 0);
      }
    }

    // --- Legs ---
    let legsGroup = null, legsFrame = 0;
    if (outfit.equipment?.legs && outfit.equipment.legs !== 0) {
      const legsObject = outfit.getLegsDataObject && outfit.getLegsDataObject();
      if (legsObject) {
        legsGroup = legsObject.getFrameGroup(groupType);
        legsFrame = isMoving
          ? this.__getWalkingFrame(legsGroup)
          : (legsGroup.getAlwaysAnimatedFrame ? legsGroup.getAlwaysAnimatedFrame() : 0);
      }
    }

    // --- Feet ---
    let feetGroup = null, feetFrame = 0;
    if (outfit.equipment?.feet && outfit.equipment.feet !== 0) {
      const feetObject = outfit.getFeetDataObject && outfit.getFeetDataObject();
      if (feetObject) {
        feetGroup = feetObject.getFrameGroup(groupType);
        feetFrame = isMoving
          ? this.__getWalkingFrame(feetGroup)
          : (feetGroup.getAlwaysAnimatedFrame ? feetGroup.getAlwaysAnimatedFrame() : 0);
      }
    }

    // --- Left Hand ---
    let leftHandGroup = null, leftHandFrame = 0;
    if (outfit.equipment?.lefthand && outfit.equipment.lefthand !== 0) {
      const leftHandObject = outfit.getLeftHandDataObject && outfit.getLeftHandDataObject();
      if (leftHandObject) {
        leftHandGroup = leftHandObject.getFrameGroup(groupType);
        leftHandFrame = isMoving
          ? this.__getWalkingFrame(leftHandGroup)
          : (leftHandGroup.getAlwaysAnimatedFrame ? leftHandGroup.getAlwaysAnimatedFrame() : 0);
      }
    }

    // --- Right Hand ---
    let rightHandGroup = null, rightHandFrame = 0;
    if (outfit.equipment?.righthand && outfit.equipment.righthand !== 0) {
      const rightHandObject = outfit.getRightHandDataObject && outfit.getRightHandDataObject();
      if (rightHandObject) {
        rightHandGroup = rightHandObject.getFrameGroup(groupType);
        rightHandFrame = isMoving
          ? this.__getWalkingFrame(rightHandGroup)
          : (rightHandGroup.getAlwaysAnimatedFrame ? rightHandGroup.getAlwaysAnimatedFrame() : 0);
      }
    }

    // --- Head/helmet or hair ---
    let headGroup = null, headFrame = 0, hairGroup = null, hairFrame = 0;
    const hasHelmet = !!(outfit.equipment?.head && outfit.equipment.head !== 0);

    if (hasHelmet) {
      const headObject = outfit.getHeadDataObject && outfit.getHeadDataObject();
      if (headObject) {
        headGroup = headObject.getFrameGroup(groupType);
        headFrame = isMoving ? this.__getWalkingFrame(headGroup) : (headGroup.getAlwaysAnimatedFrame ? headGroup.getAlwaysAnimatedFrame() : 0);
      }
    } else {
      const hairObject = outfit.getHairDataObject && outfit.getHairDataObject();
      if (hairObject) {
        hairGroup = hairObject.getFrameGroup(groupType);
        hairFrame = isMoving ? this.__getWalkingFrame(hairGroup) : (hairGroup.getAlwaysAnimatedFrame ? hairGroup.getAlwaysAnimatedFrame() : 0);
      }
    }

    return {
      characterGroup,
      characterFrame,
      bodyGroup,
      bodyFrame,
      legsGroup,
      legsFrame,
      feetGroup,
      feetFrame,
      leftHandGroup,
      leftHandFrame,
      rightHandGroup,
      rightHandFrame,
      headGroup,
      headFrame,
      hairGroup,
      hairFrame,
      isMoving,
    };
  }
}

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
    return Math.round((1 - this.creature.getMovingFraction()) * (frameGroup.animationLength - 1));
  }

  private getLayerGroupAndFrame(dataObject: any, groupType: number, walking: boolean): { group: any, frame: number } | null {
    if (!dataObject) return null;
    const group = dataObject.getFrameGroup(groupType);
    if (!group) return null;
    const frame = walking ? this.__getWalkingFrame(group) : 
      ((dataObject.frameGroups.length === 1 && !dataObject.isAlwaysAnimated()) ? 0 : group.getAlwaysAnimatedFrame());
    return { group, frame };
  }

  public getCharacterFrames(): CharacterFrames | null {
    const outfit = this.creature.outfit;
    const characterObject = outfit.getDataObject();
    if (!characterObject) return null;

    const isMoving = this.creature.isMoving();
    const groupType = isMoving ? FrameGroup.GROUP_MOVING : FrameGroup.GROUP_IDLE;
    const walking = isMoving;

    // Base body
    const { group: characterGroup, frame: characterFrame } =
      this.getLayerGroupAndFrame(characterObject, groupType, walking) || {};

    // Body equipment
    let bodyGroup = null, bodyFrame = 0;
    if (outfit.equipment?.body && outfit.equipment.body !== 0) {
      const bodyObject = outfit.getBodyDataObject && outfit.getBodyDataObject();
      if (bodyObject) {
        const result = this.getLayerGroupAndFrame(bodyObject, groupType, walking);
        if (result) {
          bodyGroup = result.group;
          bodyFrame = result.frame;
        }
      }
    }

    // Legs equipment
    let legsGroup = null, legsFrame = 0;
    if (outfit.equipment?.legs && outfit.equipment.legs !== 0) {
      const legsObject = outfit.getLegsDataObject && outfit.getLegsDataObject();
      if (legsObject) {
        const result = this.getLayerGroupAndFrame(legsObject, groupType, walking);
        if (result) {
          legsGroup = result.group;
          legsFrame = result.frame;
        }
      }
    }

    // Feet equipment
    let feetGroup = null, feetFrame = 0;
    if (outfit.equipment?.feet && outfit.equipment.feet !== 0) {
      const feetObject = outfit.getFeetDataObject && outfit.getFeetDataObject();
      if (feetObject) {
        const result = this.getLayerGroupAndFrame(feetObject, groupType, walking);
        if (result) {
          feetGroup = result.group;
          feetFrame = result.frame;
        }
      }
    }

    // Left hand equipment
    let leftHandGroup = null, leftHandFrame = 0;
    if (outfit.equipment?.lefthand && outfit.equipment.lefthand !== 0) {
      const leftHandObject = outfit.getLeftHandDataObject && outfit.getLeftHandDataObject();
      if (leftHandObject) {
        const result = this.getLayerGroupAndFrame(leftHandObject, groupType, walking);
        if (result) {
          leftHandGroup = result.group;
          leftHandFrame = result.frame;
        }
      }
    }

    // Right hand equipment
    let rightHandGroup = null, rightHandFrame = 0;
    if (outfit.equipment?.righthand && outfit.equipment.righthand !== 0) {
      const rightHandObject = outfit.getRightHandDataObject && outfit.getRightHandDataObject();
      if (rightHandObject) {
        const result = this.getLayerGroupAndFrame(rightHandObject, groupType, walking);
        if (result) {
          rightHandGroup = result.group;
          rightHandFrame = result.frame;
        }
      }
    }

    // Head/helmet or hair logic
    let headGroup = null, headFrame = 0, hairGroup = null, hairFrame = 0;
    const hasHelmet = !!(outfit.equipment?.head && outfit.equipment.head !== 0);

    if (hasHelmet) {
      const headObject = outfit.getHeadDataObject && outfit.getHeadDataObject();
      if (headObject) {
        const result = this.getLayerGroupAndFrame(headObject, groupType, walking);
        if (result) {
          headGroup = result.group;
          headFrame = result.frame;
        }
      }
    } else {
      const hairObject = outfit.getHairDataObject && outfit.getHairDataObject();
      if (hairObject) {
        const result = this.getLayerGroupAndFrame(hairObject, groupType, walking);
        if (result) {
          hairGroup = result.group;
          hairFrame = result.frame;
        }
      }
    }

    return {
      characterGroup: characterGroup || null,
      characterFrame: characterFrame || 0,
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

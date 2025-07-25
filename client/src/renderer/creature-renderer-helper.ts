import Creature from "../game/creature";
import FrameGroup from "../utils/frame-group";

export interface CharacterFrames {
  characterGroup: any; characterFrame: number;
  hairGroup?: any;     hairFrame?: number;
  headGroup?: any;     headFrame?: number;
  // Add body, legs, feet, leftHand, rightHand here if needed
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

    // Future: Add body/legs/feet/leftHand/rightHand in the same pattern.
    return {
      characterGroup: characterGroup || null,
      characterFrame: characterFrame || 0,
      headGroup,
      headFrame,
      hairGroup,
      hairFrame,
      isMoving,
    };
  }
}

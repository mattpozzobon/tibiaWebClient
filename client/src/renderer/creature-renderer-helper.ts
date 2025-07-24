import Creature from "../game/creature";
import FrameGroup from "../utils/frame-group";

export interface CharacterFrames {
  characterGroup: any;
  mountGroup: any;
  characterFrame: number;
  mountFrame: number;
  headGroup: any;
  bodyGroup: any;
  legsGroup: any;
  feetGroup: any;
  hairGroup: any;
  leftHandGroup: any;
  rightHandGroup: any;
  headFrame: number;
  bodyFrame: number;
  legsFrame: number;
  feetFrame: number;
  hairFrame: number;
  leftHandFrame: number;
  rightHandFrame: number;
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

  public getCharacterFrames(): CharacterFrames | null {
    const characterObject = this.creature.outfit.getDataObject();
    console.log('characterObject', characterObject);
    if (!characterObject) return null;

    let characterGroup, characterFrame;
    if (!this.creature.isMoving()) {
      characterGroup = characterObject.getFrameGroup(FrameGroup.GROUP_IDLE);
      characterFrame = (characterObject.frameGroups.length === 1 && !characterObject.isAlwaysAnimated())
        ? 0
        : characterGroup.getAlwaysAnimatedFrame();
    } else {
      characterGroup = characterObject.getFrameGroup(FrameGroup.GROUP_MOVING);
      characterFrame = this.__getWalkingFrame(characterGroup);
    }

    return {
      characterGroup,
      characterFrame,
      // All others are omitted in minimal version
    } as any;
  }

  
}

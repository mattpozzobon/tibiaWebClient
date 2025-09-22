import Creature from "../game/creature";
import FrameGroup from "../utils/frame-group";
import Position from "../game/position";
import { CONST } from "../helper/appContext";

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
  
  // Movement-related properties
  private __movementEvent: any;
  private __lookDirectionBuffer: any;
  private __lookDirection: number;
  private __teleported: boolean;

  constructor(creature: Creature) {
    this.creature = creature;
    this.__movementEvent = null;
    this.__lookDirectionBuffer = null;
    this.__lookDirection = creature.vitals.direction;
    this.__teleported = false;
  }

  // Movement-related methods
  public getMoveOffset(): Position {
    // If the creature is not moving or has teleported, return a null offset.
    if (!this.isMoving() || this.__teleported) {
      return Position.NULL;
    }
    
    const fraction = this.getMovingFraction();
    
    // Calculate offset based on movement direction
    switch (this.getLookDirection()) {
      case CONST.DIRECTION.WEST:
        return new Position(-fraction, 0, 0);
      case CONST.DIRECTION.NORTH:
        return new Position(0, -fraction, 0);
      case CONST.DIRECTION.EAST:
        return new Position(fraction, 0, 0);
      case CONST.DIRECTION.SOUTH:
        return new Position(0, fraction, 0);
      case CONST.DIRECTION.NORTHWEST:
        return new Position(-fraction, -fraction, 0);
      case CONST.DIRECTION.NORTHEAST:
        return new Position(fraction, -fraction, 0);
      case CONST.DIRECTION.SOUTHEAST:
        return new Position(fraction, fraction, 0);
      case CONST.DIRECTION.SOUTHWEST:
        return new Position(-fraction, fraction, 0);
      default:
        return new Position(0, 0, 0);
    }
  }

  public getElevationOffset(): number {
    const endTile = window.gameClient.world.getTileFromWorldPosition(this.creature.getPosition());
    const endElevation = endTile ? endTile.__renderElevation : 0;
    return endElevation;
  }

  public moveTo(position: Position, stepDurationTicks: number): any {
    if (!window.gameClient.world.isValidWorldPosition(position)) return false;
  
    this.creature.__chunk = window.gameClient.world.getChunkFromWorldPosition(position);
  
    // Only cancel existing movement if we're moving to a different position
    if (this.__movementEvent && !this.creature.getPosition().equals(position)) {
      this.__movementEvent.cancel();
    }
  
    // Save old position
    this.creature.__previousPosition = this.creature.getPosition().copy();
  
    this.__movementEvent = window.gameClient.eventQueue.addEvent(this.unlockMovement.bind(this), stepDurationTicks + 1);
  
    const angle = this.creature.getPosition().getLookDirection(position);
    if (angle !== null) this.__lookDirection = angle;
  
    this.creature.vitals.position = position;
  
    if (window.gameClient.player?.canSeeSmall(this.creature) && position.z === window.gameClient.player.vitals.position.z) {
      //window.gameClient.interface.soundManager.playWalkBit(position);
    }
  }

  public unlockMovement(): any {
    if (this.__lookDirectionBuffer !== null) {
      this.__lookDirection = this.__lookDirectionBuffer;
      this.__lookDirectionBuffer = null;
    }
    
    this.__movementEvent = null;
    this.__teleported = false;

    if (window.gameClient.player && this.creature.id === window.gameClient.player.id && window.gameClient.world.pathfinder.__pathfindCache.length > 0) {
      return window.gameClient.world.pathfinder.handlePathfind();
    }

    // if (window.gameClient.player && this.creature.id === window.gameClient.player.id) {
    //   if (window.gameClient.player.__movementBuffer !== null) {
    //     const buffered = window.gameClient.player.__movementBuffer;
    //     window.gameClient.player.__movementBuffer = null;
    //     window.gameClient.keyboard.handleCharacterMovement(buffered);
    //   }
    // }
  }

  public getLookDirection(): number {
    return this.__lookDirection;
  }

  public getElevation(): number {
    const tile = window.gameClient.world.getTileFromWorldPosition(this.creature.getPosition());
    const elevation = tile ? tile.__renderElevation : 0;
    return elevation;
  }

  public setTurnBuffer(direction: number): void {
    if (this.isMoving()) {
      this.__lookDirectionBuffer = direction;
      return;
    }
    this.__setLookDirection(direction);
  }

  public isMoving(): boolean {
    return this.__movementEvent !== null;
  }

  public getMovingFraction(): number {
    if (!this.__movementEvent || this.__teleported) {
      return 0;
    }
  
    return this.__movementEvent.remainingFraction();
  }

  public __setLookDirection(direction: number): void {
    this.__lookDirection = direction;
  }

  public setTeleported(teleported: boolean): void {
    this.__teleported = teleported;
  }

  public getTeleported(): boolean {
    return this.__teleported;
  }

  public getMovementEvent(): any {
    return this.__movementEvent;
  }

  public setMovementEvent(event: any): void {
    this.__movementEvent = event;
  }

  public getElapsedWalkTime(): number {
    if (!this.isMoving() || !this.__movementEvent?.getElapsedTime) return 0;
    return this.__movementEvent.getElapsedTime();
  }
  
  public getStepDurationMs(): number {
    if (!this.isMoving() || !this.__movementEvent?.getTotalDuration) return 0;
    return this.__movementEvent.getTotalDuration();
  }

  protected __getWalkingFrame(frameGroup: any): number {
    // if (!frameGroup || !this.creature.isMoving()) return 0;
  
    // const animTime = this.getElapsedWalkTime();     // Real time elapsed since movement started (ms)
    // const totalTime = this.getStepDurationMs();     // Total movement duration (ms)
    // const frameCount = frameGroup.animationLength;
    // if (frameCount <= 1 || totalTime === 0) return 0;

    // const progress = Math.min(animTime / totalTime, frameCount);
    // const frameIndex = Math.floor(progress * frameCount);
    // return Math.max(0, Math.min(frameIndex, frameCount));

    return Math.round((1 - this.getMovingFraction()) * (frameGroup.animationLength - 1))

  }
  

  public getCharacterFrames(): CharacterFrames | null {
    const outfit = this.creature.outfit;
    const characterObject = outfit.getDataObject();
    if (!characterObject) return null;

    const isMoving = this.isMoving();
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

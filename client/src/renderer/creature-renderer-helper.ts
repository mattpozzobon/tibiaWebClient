import Creature from "../game/creature";
import FrameGroup from "../utils/frame-group";
import Position from "../game/position";
import { CONST } from "../helper/appContext";

export interface CharacterFrames {
  characterGroup: any;
  bodyGroup?: any;
  legsGroup?: any;
  feetGroup?: any;
  leftHandGroup?: any;
  rightHandGroup?: any;
  backpackGroup?: any;
  beltGroup?: any;
  hairGroup?: any;
  headGroup?: any;
  healthPotionGroup?: any;
  manaPotionGroup?: any;
  energyPotionGroup?: any;
  bagGroup?: any;
  frame: number; // Single frame for all groups
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
    
    // Single shared frame for character, equipment, and addons
    const sharedFrame = isMoving 
      ? this.__getWalkingFrame(characterGroup) 
      : ((characterObject.frameGroups.length === 1 && !characterObject.isAlwaysAnimated()) ? 0 : characterGroup.getAlwaysAnimatedFrame());
    
    // Unified helper function for both equipment and addons
    const getGroup = (getterFn: () => any) => {
      const object = getterFn();
      if (object) {
        const group = object.getFrameGroup(groupType);
        return group || null;
      }
      return null;
    };

    // Equipment configuration
    const equipmentConfig = [
      { key: 'bodyGroup', condition: outfit.equipment?.body, getter: () => outfit.getBodyDataObject?.() },
      { key: 'legsGroup', condition: outfit.equipment?.legs, getter: () => outfit.getLegsDataObject?.() },
      { key: 'feetGroup', condition: outfit.equipment?.feet, getter: () => outfit.getFeetDataObject?.() },
      { key: 'leftHandGroup', condition: outfit.equipment?.lefthand, getter: () => outfit.getLeftHandDataObject?.() },
      { key: 'rightHandGroup', condition: outfit.equipment?.righthand, getter: () => outfit.getRightHandDataObject?.() },
      { key: 'backpackGroup', condition: outfit.equipment?.backpack, getter: () => outfit.getBackpackDataObject?.() },
      { key: 'beltGroup', condition: outfit.equipment?.belt, getter: () => outfit.getBeltDataObject?.() },
    ];

    // Addon configuration
    const addonConfig = [
      { key: 'healthPotionGroup', condition: outfit.addons?.healthPotion, getter: () => window.gameClient.dataObjects.getOutfit(800) },
      { key: 'manaPotionGroup', condition: outfit.addons?.manaPotion, getter: () => window.gameClient.dataObjects.getOutfit(801) },
      { key: 'energyPotionGroup', condition: outfit.addons?.energyPotion, getter: () => window.gameClient.dataObjects.getOutfit(802) },
      { key: 'bagGroup', condition: outfit.addons?.bag, getter: () => window.gameClient.dataObjects.getOutfit(803) },
    ];

    // Initialize all groups
    const groups: Record<string, any> = {};
    
    // Process equipment
    equipmentConfig.forEach(({ key, condition, getter }) => {
      if (condition && condition !== 0) {
        groups[key] = getGroup(getter);
      }
    });

    // Process addons
    addonConfig.forEach(({ key, condition, getter }) => {
      if (condition && condition !== 0) {
        groups[key] = getGroup(getter);
      }
    });

    // Handle head/hair (special case)
    const hasHelmet = !!(outfit.equipment?.head && outfit.equipment.head !== 0);
    if (hasHelmet) {
      groups.headGroup = getGroup(() => outfit.getHeadDataObject?.());
    } else {
      groups.hairGroup = getGroup(() => outfit.getHairDataObject?.());
    }

    return {
      characterGroup,
      bodyGroup: groups.bodyGroup,
      legsGroup: groups.legsGroup,
      feetGroup: groups.feetGroup,
      leftHandGroup: groups.leftHandGroup,
      rightHandGroup: groups.rightHandGroup,
      backpackGroup: groups.backpackGroup,
      beltGroup: groups.beltGroup,
      headGroup: groups.headGroup,
      hairGroup: groups.hairGroup,
      healthPotionGroup: groups.healthPotionGroup,
      manaPotionGroup: groups.manaPotionGroup,
      energyPotionGroup: groups.energyPotionGroup,
      bagGroup: groups.bagGroup,
      frame: sharedFrame, // Single frame for all groups
      isMoving,
    };
  }
}

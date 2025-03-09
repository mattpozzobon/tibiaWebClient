import Outfit from "./outfit";
import Position from "./position";
import GameClient from "./gameclient";
import ConditionManager from "./condition";
import SpriteBuffer from "./sprite-buffer";
import FrameGroup from "./frame-group";
import { CONST } from "./helper/appContext";
import BoxAnimation from "./box-animation"; 
import CastingManager from "./casting-manager";
import CharacterElement from "./screen-element-character";
import State from "./state";

// Define an interface for the data passed to the Creature constructor.
export interface CreatureData {
  id: number;
  type?: number;
  name: string;
  position: Position;
  maxHealth: number;
  speed: number;
  attackSlowness: number;
  conditions: any;
  direction: number;
  outfit: any;
  friendlist?: any;
  health: number;
  mana: number;
  maxMana: number;
  energy: number;
  maxEnergy: number;
  speedValue?: number; // if needed
  // ... add other properties as needed.
}

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

export default class Creature {
  public state: State;
  public id: number;
  public type: number;
  public name: string;
  __position: Position;
  public maxHealth: number;
  public speed: number;
  public attackSlowness: number;
  public conditions: ConditionManager;
  public __lookDirection: number;
  public __previousPosition: Position;
  public outfit: Outfit;
  public castingManager: CastingManager;
  public spriteBuffer: SpriteBuffer;
  public spriteBufferMount?: SpriteBuffer;
  public textBuffer = [];
  public __movementEvent: any;
  public __lookDirectionBuffer: any;
  public __chunk: any;
  __teleported: boolean;
  // This method should create and assign a DOM element representing the creature.
  public __activeTextElement: any;
  public __target: any;
  public __animations: Set<any>;
  // Assume characterElement is provided (e.g., by Creature or assigned later)
  public characterElement: any;

  // gameClient is injected to replace global references.

  constructor(data: CreatureData) {

    this.state = new State();
    // Register a state callback for health updates.
    this.state.add("health", this.setHealthStatus.bind(this));

    this.id = data.id;
    this.type = data.type != null ? data.type : 0;
    this.name = data.name;
    this.__position = data.position;
    this.maxHealth = data.maxHealth;
    this.speed = data.speed;
    this.attackSlowness = data.attackSlowness;
    this.conditions = new ConditionManager(this, data.conditions);

    this.__lookDirection = data.direction;
    this.__previousPosition = data.position.copy();

    this.outfit = new Outfit(data.outfit);
    this.castingManager = new CastingManager();

    // Initialize spriteBuffer using outfit's sprite buffer size.
    this.spriteBuffer = new SpriteBuffer(this.outfit.getSpriteBufferSize(this.outfit.getDataObject()));
    if (this.outfit.getDataObjectMount()) {
      this.spriteBufferMount = new SpriteBuffer(this.outfit.getSpriteBufferSize(this.outfit.getDataObjectMount()));
    }

    this.__movementEvent = null;
    this.__lookDirectionBuffer = null;
    this.__chunk = window.gameClient.world.getChunkFromWorldPosition(this.__position);
    this.__teleported = false;

    // Create the character element (method implementation assumed).
    this.__createCharacterElement();

    this.__activeTextElement = null;
    this.__target = null;
    this.__animations = new Set();

    // Set initial health from data.
    this.state.health = data.health;
  }

  public __createCharacterElement(): void {
    // We use a sticky text element for the nametag.
    this.characterElement = new CharacterElement(this);
  
    // Add it to the DOM.
    window.gameClient.interface.screenElementManager.add(this.characterElement.element);
  
    // Make sure to update it directly.
    this.characterElement.setHealthFraction(this.getHealthFraction());
  }

  public setHealthStatus(): void {
    // Implementation for setting health status should be provided.
    // For example, update a health bar in the UI.
  }

  public removeCondition(cid: number): void {
    this.conditions.remove(cid);
  }

  public addCondition(cid: number): void {
    this.conditions.add(cid);
  }

  public hasCondition(cid: number): boolean {
    return this.conditions.has(cid);
  }

  public blockHit(): any {
    return window.gameClient.renderer.addPositionAnimation({position: this.__position, type: 3,});
  }
  
  public getMaxFloor(): number {
    return window.gameClient.world
      .getChunkFromWorldPosition(this.getPosition())
      .getFirstFloorFromBottom(this.getPosition());
  }

  public getCharacterFrames(): CharacterFrames | null {
    const characterObject = this.outfit.getDataObject();
    const mountObject = this.outfit.getDataObjectMount();

    const headObject = this.outfit.equipment.head !== 0 ? this.outfit.getHeadDataObject() : null;
    const bodyObject = this.outfit.equipment.body !== 0 ? this.outfit.getBodyDataObject() : null;
    const legsObject = this.outfit.equipment.legs !== 0 ? this.outfit.getLegsDataObject() : null;
    const feetObject = this.outfit.equipment.feet !== 0 ? this.outfit.getFeetDataObject() : null;

    let hairObject: any = null;
    if (this.outfit.equipment.head === 0) {
      hairObject = this.outfit.getHairDataObject();
    }

    const leftHandObject = this.outfit.equipment.lefthand !== 0 ? this.outfit.getLeftHandDataObject() : null;
    const rightHandObject = this.outfit.equipment.righthand !== 0 ? this.outfit.getRightHandDataObject() : null;

    if (characterObject === null) {
      return null;
    }

    let characterGroup: any, mountGroup: any, characterFrame: number, mountFrame: number;
    let headGroup: any, bodyGroup: any, legsGroup: any, feetGroup: any, hairGroup: any;
    let leftHandGroup: any, rightHandGroup: any, leftHandFrame: number, rightHandFrame: number;
    let headFrame: number, bodyFrame: number, legsFrame: number, feetFrame: number, hairFrame: number;
    let isMoving: boolean;

    if (!this.isMoving()) {
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

  public getPosition(): Position {
    return this.__position;
  }

  public hasTarget(): boolean {
    return this.__target !== null;
  }

  public isMounted(): boolean {
    return this.outfit.mounted;
  }

  public serverSetOutfit(outfit: Outfit): void {
    this.outfit = outfit;
    // Clear the outfit sprite buffer to make room for the new sprite.
    this.spriteBuffer = new SpriteBuffer(this.outfit.getSpriteBufferSize(this.outfit.getDataObject()));
    // If the creature has a mount, create a sprite buffer for it as well.
    if (this.outfit.getDataObjectMount()) {
      this.spriteBufferMount = new SpriteBuffer(this.outfit.getSpriteBufferSize(this.outfit.getDataObjectMount()));
    }
  }

  public setPosition(position: Position): void {
    // Remove from the previous tile.
    const fromTile = window.gameClient.world.getTileFromWorldPosition(this.getPosition());
    if (fromTile !== null) {
      fromTile.removeCreature(this);
    }
    // Update the position and set the new chunk.
    this.__position = position;
    this.__chunk = window.gameClient.world.getChunkFromWorldPosition(position);
    // Add the creature to the new tile.
    window.gameClient.world.getTileFromWorldPosition(position)?.addCreature(this);
  }

  public getHealthPercentage(): string {
    const fraction = this.getHealthFraction();
    return (100 * this.clamp(fraction, 0, 1)).toString();
  }

  public getHealthFraction(): number {
    return this.clamp(this.state.health / this.maxHealth, 0, 1);
  }

  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public say(packet: any): any {
    // Reset the text buffer.
    this.textBuffer = [];
    // If there is an active text element, complete it.
    if (this.__activeTextElement !== null) {
      this.__activeTextElement.complete();
    }
    // Split message by new lines.
    this.textBuffer = packet.message.split("\n");
    // Set and return the new active text element.
    return this.__setActiveTextElement(this.textBuffer.shift()!, packet.color);
  }

  // Method: addBoxAnimation
  public addBoxAnimation(color: number): void {
    this.__animations.add(new BoxAnimation(color));
  }

  // Method: deleteAnimation
  public deleteAnimation(animation: Animation): void {
    this.__animations.delete(animation);
  }

  // Method: addAnimation
  public addAnimation(id: number): void {
    const aid = window.gameClient.dataObjects.getAnimationId(id);
    if (aid === null) {
      return;
    }
    // TODO: Implement Animation class.
    //this.__animations.add(new Animation(aid));
  }

  // Method: increaseHealth
  public increaseHealth(amount: number): void {
    // Assuming state.health and maxHealth are numbers and a .clamp method exists on number.
    this.state.health = (this.state.health + amount).clamp(0, this.maxHealth);
  }

  // Method: getTarget
  public getTarget(): Creature | null {
    return this.__target;
  }

  // Method: remove (removes creature's DOM element)
  public remove(): void {
    this.characterElement.remove();
  }

  // Method: getMoveOffset
  public getMoveOffset(): Position {
    // If the creature is not moving or has teleported, return a null offset.
    if (!this.isMoving() || this.__teleported) {
      return Position.NULL;
    }
    const fraction = this.getMovingFraction();
    switch (this.getLookDirection()) {
      case CONST.DIRECTION.WEST:
        return new Position(-fraction, 0, 0);
      case CONST.DIRECTION.NORTH:
        return new Position(0, -fraction, 0);
      case CONST.DIRECTION.EAST:
        return new Position(fraction, 0, 0);
      case CONST.DIRECTION.SOUTH:
        return new Position(0, fraction, 0);
      // TODO: Implement diagonal movement.
      // case CONST.DIRECTION.NORTH_WEST:
      //   return new Position(-fraction, -fraction, 0);
      // case CONST.DIRECTION.NORTH_EAST:
      //   return new Position(fraction, -fraction, 0);
      // case CONST.DIRECTION.SOUTH_EAST:
      //   return new Position(fraction, fraction, 0);
      // case CONST.DIRECTION.SOUTH_WEST:
      //   return new Position(-fraction, fraction, 0);
      default:
        return new Position(0, 0, 0);
    }
  }

  public moveTo(position: Position, speed: number): any {
    if (!window.gameClient.world.isValidWorldPosition(position)) {
      return false;
    }
    this.__chunk = window.gameClient.world.getChunkFromWorldPosition(position);

    if (this.__movementEvent) {
      this.__movementEvent.cancel();
    }

    const modSlowness = (this.getPosition().isDiagonal(position) ? 2 : 1) * speed;
    this.__movementEvent = window.gameClient.eventQueue.addEvent(this.unlockMovement.bind(this), modSlowness);
    const angle = this.getPosition().getLookDirection(position);

    if (angle !== null) {
      this.__lookDirection = angle;
    }

    this.__previousPosition = this.getPosition();
    this.__position = position;

    if (window.gameClient.player!.canSeeSmall(this) && position.z === window.gameClient.player!.__position.z) {
      window.gameClient.interface.soundManager.playWalkBit(position);
    }

    if (window.gameClient.player && this.id === window.gameClient.player.id) {
      return window.gameClient.renderer.minimap.cache();
    }
  }
  
  public getLookDirection(): number {
    return this.__lookDirection;
  }
  
  public setTurnBuffer(direction: number): void {
    if (this.isMoving()) {
      this.__lookDirectionBuffer = direction;
      return;
    }
    this.__setLookDirection(direction);
  }
  
  public unlockMovement(): any {
    if (this.__lookDirectionBuffer !== null) {
      this.__lookDirection = this.__lookDirectionBuffer;
      this.__lookDirectionBuffer = null;
    }
    this.__movementEvent = null;
    this.__teleported = false;
    if (
      window.gameClient.player && 
      this.id === window.gameClient.player.id && 
      window.gameClient.world.pathfinder.__pathfindCache.length > 0
    ) {
      return window.gameClient.world.pathfinder.handlePathfind();
    }

    // TODO: Implement movement buffer handling.
    // if (
    //   window.gameClient.player &&
    //   this.id === window.gameClient.player.id &&
    //   this.__movementBuffer !== null
    // ) {
    //   window.gameClient.keyboard.handleCharacterMovement(this.__movementBuffer);
    //   this.__movementBuffer = null;
    // }
  }
  

  public getChunk(): any {
    return this.__chunk;
  }
  
  public isMoving(): boolean {
    return this.__movementEvent !== null;
  }
  
  public getMovingFraction(): number {
    // If not moving or teleported, fraction is 0.
    if (!this.isMoving() || this.__teleported) {
      return 0;
    }
    return this.__movementEvent.remainingFraction();
  }
  
  public canSee(thing: { getPosition(): Position }): boolean {
    const projectedSelf = this.getPosition().projected();
    const projectedThing = thing.getPosition().projected();
    const dx = Math.abs(projectedSelf.x - projectedThing.x);
    const dy = Math.abs(projectedSelf.y - projectedThing.y);
    return (dx < 10) && (dy < 8);
  }
  
  public canSeeSmall(thing: { getPosition(): Position }): boolean {
    const projectedSelf = this.getPosition().projected();
    const projectedThing = thing.getPosition().projected();
    const dx = Math.abs(projectedSelf.x - projectedThing.x);
    const dy = Math.abs(projectedSelf.y - projectedThing.y);
    return (dx < 8) && (dy < 6);
  }
  
  protected __setLookDirection(direction: number): void {
    this.__lookDirection = direction;
  }
  
  protected __setActiveTextElement(message: string, color: number): any {
    // Sets a new active text element for the creature.
    this.__activeTextElement = window.gameClient.interface.screenElementManager.createTextElement(this, message, color);
    return this.__activeTextElement;
  }
  
  protected __getWalkingFrame(frameGroup: any): number {
    // Calculate walking frame based on remaining movement fraction.
    return Math.round((1 - this.getMovingFraction()) * (frameGroup.animationLength - 1));
  }
  
} 

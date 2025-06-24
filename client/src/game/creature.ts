
import Position from "./position";
import { CONST } from "../helper/appContext";

import Outfit from "./outfit";
import SpriteBuffer from "../renderer/sprite-buffer";
import FrameGroup from "../utils/frame-group";
import ConditionManager from "./condition";
import { Vitals, VitalsData } from "./player/vitals/vitals";
import Interface from "../ui/interface";
import CastingManager from "../ui/managers/casting-manager";
import CharacterElement from "../ui/screen-elements/screen-element-character";
import BoxAnimation from "../utils/box-animation";
import CreatureRenderer from "../renderer/creature-renderer";


export interface CreatureData {
  id: number;
  type?: number;
  outfit: any;
  vitals: VitalsData;
  conditions: any;
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
  public id: number;
  public type: number;
  public conditions: ConditionManager;
  public __lookDirection: number;
  public __previousPosition: Position;
  public outfit: Outfit;
  public castingManager: CastingManager;
  public textBuffer = [];
  public __movementEvent: any;
  public __lookDirectionBuffer: any;
  public __chunk: any;
  public __teleported: boolean;
  // This method should create and assign a DOM element representing the creature.
  public __activeTextElement: any;
  public __target: any;
  public __animations: Set<any>;
  // Assume characterElement is provided (e.g., by Creature or assigned later)
  public characterElement: CharacterElement;
  public vitals: Vitals;
  public renderer: CreatureRenderer;
  
  // gameClient is injected to replace global references.

  constructor(data: CreatureData) {

    this.vitals = new Vitals(data.vitals);
    this.id = data.id;
    this.type = data.type != null ? data.type : 0;
    this.conditions = new ConditionManager(this, data.conditions);
    this.__lookDirection = data.vitals.direction;
    this.__previousPosition = data.vitals.position.copy();
    this.outfit = new Outfit(data.outfit);
    this.castingManager = new CastingManager();


    this.renderer = new CreatureRenderer(this);

    this.__movementEvent = null;
    this.__lookDirectionBuffer = null;
    this.__chunk = window.gameClient.world.getChunkFromWorldPosition(this.vitals.position);
    this.__teleported = false;

    // Create the character element (method implementation assumed).
    this.characterElement = new CharacterElement(this);
    window.gameClient.interface.screenElementManager.add(this.characterElement.element);
    this.characterElement.setHealthFraction(this.getHealthFraction());

    this.__activeTextElement = null;
    this.__target = null;
    this.__animations = new Set();
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
    return window.gameClient.renderer.addPositionAnimation({position: this.vitals.position, type: 3});
  }
  
  public getMaxFloor(): number {
    return window.gameClient.world
      .getChunkFromWorldPosition(this.getPosition())
      .getFirstFloorFromBottom(this.getPosition());
  }

  public getPosition(): Position {
    return this.vitals.position;
  }

  public getName(): string {
    return this.vitals.name;
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
    this.renderer.spriteBuffer = new SpriteBuffer(this.outfit.getSpriteBufferSize(this.outfit.getDataObject()));
    // If the creature has a mount, create a sprite buffer for it as well.
    if (this.outfit.getDataObjectMount()) {
      this.renderer.spriteBufferMount = new SpriteBuffer(this.outfit.getSpriteBufferSize(this.outfit.getDataObjectMount()));
    }
  }

  public setPosition(position: Position): void {
    // Remove from the previous tile.
    const fromTile = window.gameClient.world.getTileFromWorldPosition(this.getPosition());
    if (fromTile !== null) {
      fromTile.removeCreature(this);
    }
    // Update the position and set the new chunk.
    this.vitals.position = position;
    this.__chunk = window.gameClient.world.getChunkFromWorldPosition(position);
    // Add the creature to the new tile.
    window.gameClient.world.getTileFromWorldPosition(position)?.addCreature(this);
  }

  public getHealthPercentage(): string {
    const fraction = this.getHealthFraction();
    return (100 * this.clamp(fraction, 0, 1)).toString();
  }

  public getHealthFraction(): number {
    return this.clamp(this.vitals.state.health / this.vitals.state.maxHealth, 0, 1);
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
    this.vitals.state.health = (this.vitals.state.health + amount).clamp(0, this.vitals.state.maxHealth);
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
    this.vitals.position = position;

    if (window.gameClient.player!.canSeeSmall(this) && position.z === window.gameClient.player!.vitals.position.z) {
      window.gameClient.interface.soundManager.playWalkBit(position);
    }

    if (window.gameClient.player && this.id === window.gameClient.player.id) {
     // return window.gameClient.renderer.minimap.cache();
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
    return (dx < (Interface.TILE_WIDTH+2)/2) && (dy < (Interface.TILE_HEIGHT+2)/2);
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

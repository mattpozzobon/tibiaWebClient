
import Position from "./position";
import Outfit from "./outfit";
import ConditionManager from "./condition";
import { Vitals, VitalsData } from "./player/vitals/vitals";
import Interface from "../ui/interface";
import CastingManager from "../ui/managers/casting-manager";
import BoxAnimation from "../utils/box-animation";
import CreatureRendererHelper from "../renderer/creature-renderer-helper";
import CharacterPixiElement from "../ui/screen-elements/screen-element-character";


export interface CreatureData {
  id: number;
  type?: number;
  outfit: any;
  vitals: VitalsData;
  conditions: any;
}

export default class Creature {
  public id: number;
  public type: number;
  public conditions: ConditionManager;
  public __previousPosition: Position;
  public outfit: Outfit;
  public castingManager: CastingManager;
  public textBuffer = [];
  public __chunk: any;
  public __activeTextElement: any;
  public __target: any;
  public __animations: Set<any>;
  public characterElementPixi!: CharacterPixiElement;
  public vitals: Vitals;
  public renderer: CreatureRendererHelper;
  
  // gameClient is injected to replace global references.
  constructor(data: CreatureData) {

    this.vitals = new Vitals(data.vitals);
    this.id = data.id;
    this.type = data.type != null ? data.type : 0;
    this.conditions = new ConditionManager(this, data.conditions);
    this.outfit = new Outfit(data.outfit);
    this.castingManager = new CastingManager();
    this.renderer = new CreatureRendererHelper(this);
 
    this.__chunk = window.gameClient.world.getChunkFromWorldPosition(this.vitals.position);

    this.__previousPosition = data.vitals.position.copy();
    this.__activeTextElement = null;
    this.__target = null;
    this.__animations = new Set();
  }

  static create(data: CreatureData): Creature {
    const creature = new Creature(data);
    creature.characterElementPixi = new CharacterPixiElement(creature);
    return creature;
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
    return window.gameClient.renderer.animationRenderer.addPositionAnimation({position: this.vitals.position, type: 3});
  }
  
  public getMaxFloor(): number {
    return window.gameClient.world.getChunkFromWorldPosition(this.getPosition()).getFirstOccludingFloorAbove(this.getPosition());
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


  public serverSetOutfit(outfit: Outfit): void {
    this.outfit = outfit;
    // Clear the texture cache to force regeneration of sprites with new outfit colors
    // This ensures that masked sprites will be recomposed with the new outfit colors
    if (window.gameClient.renderer.creatureRenderer) {
      window.gameClient.renderer.creatureRenderer.clearTextureCache();
    }
    // Force refresh of the creature's renderer helper to update hair/head logic
    this.renderer = new CreatureRendererHelper(this);
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

  public getManaFraction(): number {
    return this.clamp(this.vitals.state.mana / this.vitals.state.maxMana, 0, 1);
  }

  public getEnergyFraction(): number {
    return this.clamp(this.vitals.state.energy / this.vitals.state.maxEnergy, 0, 1);
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
    this.vitals.state.health = (this.vitals.state.health + amount).clamp(0, this.vitals.state.maxHealth);
  }

  // Method: getTarget
  public getTarget(): Creature | null {
    return this.__target;
  }

  // Method: Characther Element Pixi
  public remove(): void {
    this.characterElementPixi.remove();
  }

  // Method: getMoveOffset
  public getMoveOffset(): Position {
    return this.renderer.getMoveOffset();
  }

  public moveTo(position: Position, stepDurationTicks: number): any {
    return this.renderer.moveTo(position, stepDurationTicks);
  }

  public unlockMovement(): any {
    return this.renderer.unlockMovement();
  }
  
  public getLookDirection(): number {
    return this.renderer.getLookDirection();
  }
  
  public setTurnBuffer(direction: number): void {
    this.renderer.setTurnBuffer(direction);
  }

  public getChunk(): any {
    return this.__chunk;
  }
  
  // Method: isMoving
  public isMoving(): boolean {
    return this.renderer.isMoving();
  }
  
  public getMovingFraction(): number {
    return this.renderer.getMovingFraction();
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
  
  public __setLookDirection(direction: number): void {
    this.renderer.__setLookDirection(direction);
  }
  
  protected __setActiveTextElement(message: string, color: number): any {
    // Sets a new active text element for the creature.
    this.__activeTextElement = window.gameClient.interface.screenElementManager.createFloatingTextElement(message, this, color);
    return this.__activeTextElement;
  }
  
} 

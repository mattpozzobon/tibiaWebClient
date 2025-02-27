import GameClient from "./gameclient";
import HeapEvent from "./heap-event";

export default class CastingManager {
  private __castBegin: HeapEvent | null;
  private __spell: any;
 

  constructor() {
    
    this.__castBegin = null;
    this.__spell = null;
  }

  public isCasting(): boolean {
    return this.__castBegin !== null;
  }

  public beginCast(spell: any): void {
    // Schedule an event for when casting should end.
    this.__castBegin = window.gameClient.eventQueue.addEvent(
      this.endCast.bind(this),
      spell.cast || spell.channel
    ) as HeapEvent | null;
    this.__spell = spell;
  }

  public endCast(): void {
    this.__castBegin = null;
    this.__spell = null;
  }

  public getCastFraction(): number {
    if (this.__castBegin === null) {
      return 0;
    }
    // TODO: Check remainingFrames() method in HeapEvent.
    // Assuming __castBegin.remainingFrames() returns a number.
    return 1 - this.__castBegin.remainingMillis();
  }
}

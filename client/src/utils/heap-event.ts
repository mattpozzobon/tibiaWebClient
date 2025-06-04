import GameClient from "../core/gameclient";

export default class HeapEvent {
  public callback: () => void;
  public length: number;
  public cancelled: boolean;
  public __f: number;
 

  constructor(callback: () => void, when: number) {
    
    this.callback = callback;
    this.length = when;
    this.cancelled = false;
    this.__f = window.gameClient.eventQueue.__internalDelta + when;
  }

  public extendTo(when: number): HeapEvent | void {
    this.cancel();
    return window.gameClient.eventQueue.addEvent(this.callback, window.gameClient.eventQueue.__internalDelta + when);
  }

  public complete(): void {
    // Cancel the event, then immediately execute the callback.
    this.cancel();
    this.callback();
  }

  public cancel(): void {
    this.cancelled = true;
  }

  public remainingMillis(): number {
    return this.__f - window.gameClient.eventQueue.__internalDelta;
  }

  public remainingSeconds(): number {
    return 1E-3 * this.remainingMillis();
  }

  public remainingFraction(): number {
    return this.remainingMillis() / this.length;
  }
}

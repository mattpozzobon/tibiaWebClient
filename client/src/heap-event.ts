import GameClient from "./gameclient";

export default class HeapEvent {
  public callback: () => void;
  public length: number;
  public cancelled: boolean;
  public __f: number;
  private gameClient: GameClient;

  constructor(gameClient: GameClient, callback: () => void, when: number) {
    this.gameClient = gameClient;
    this.callback = callback;
    this.length = when;
    this.cancelled = false;
    this.__f = gameClient.eventQueue.__internalDelta + when;
  }

  public extendTo(when: number): HeapEvent | void {
    this.cancel();
    return this.gameClient.eventQueue.addEvent(this.callback, this.gameClient.eventQueue.__internalDelta + when);
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
    return this.__f - this.gameClient.eventQueue.__internalDelta;
  }

  public remainingSeconds(): number {
    return 1E-3 * this.remainingMillis();
  }

  public remainingFraction(): number {
    return this.remainingMillis() / this.length;
  }
}

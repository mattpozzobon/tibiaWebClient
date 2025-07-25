import Position from "../game/position";
import Animation from "./animation";

export default class DistanceAnimation extends Animation {
  public fromPosition: Position;
  public toPosition: Position;
  private _cachedFraction: number = -1;
  private _cachedFractionTime: number = 0;

  constructor(id: number, fromPosition: Position, toPosition: Position) {
    super(id);
    this.fromPosition = fromPosition;
    this.toPosition = toPosition;
  }

  __generateDurations(): number[] {
    return [4 * Animation.DEFAULT_FRAME_LENGTH_MS];
  }

  public getFraction(): number {
    const now = performance.now();
    
    // Cache fraction calculation for 16ms (60fps) to avoid repeated calculations
    if (this._cachedFractionTime === 0 || now - this._cachedFractionTime > 16) {
      const totalDuration = this.totalDuration();
      this._cachedFraction = Math.min(1, (now - this.__created) / totalDuration);
      this._cachedFractionTime = now;
    }
    
    return this._cachedFraction;
  }

  public getPosition(): Position {
    return this.fromPosition;
  }

  public getPattern(): Position {
    const x = this.fromPosition.x - this.toPosition.x;
    const y = this.fromPosition.y - this.toPosition.y;

    if (x === 0 && y === 0) {
      return new Position(4, 0, 0);
    }

    const angle = Math.floor(
      (8 * (1.125 * Math.PI + Math.atan2(y, x))) / (2 * Math.PI)
    );

    switch (angle % 8) {
      case 0:
        return new Position(5, 0, 0);
      case 1:
        return new Position(8, 0, 0);
      case 2:
        return new Position(7, 0, 0);
      case 3:
        return new Position(6, 0, 0);
      case 4:
        return new Position(3, 0, 0);
      case 5:
        return new Position(0, 0, 0);
      case 6:
        return new Position(1, 0, 0);
      case 7:
        return new Position(2, 0, 0);
      default:
        return new Position(4, 0, 0);
    }
  }
}

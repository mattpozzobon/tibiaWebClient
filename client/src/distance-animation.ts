import Position from "./position";
import Animation from "./animation";
import GameClient from "./gameclient";

export default class DistanceAnimation extends Animation {
  public fromPosition: Position;
  public toPosition: Position;

  constructor(id: number, fromPosition: Position, toPosition: Position) {
    super(id);
    this.fromPosition = fromPosition;
    this.toPosition = toPosition;
  }

  __generateDurations(): number[] {
    return [2 * Animation.DEFAULT_FRAME_LENGTH_MS];
  }

  public getFraction(): number {
    return Math.min(
      1,
      (performance.now() - this.__created) /
        (2 * Animation.DEFAULT_FRAME_LENGTH_MS)
    );
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

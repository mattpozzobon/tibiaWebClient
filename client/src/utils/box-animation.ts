import Animation from "./animation";
import GameClient from "../core/gameclient";

export default class BoxAnimation extends Animation {
  public color: number;
  public DEFAULT_BLINK_LENGTH_MS: number = 500;

  constructor(color: number) {
    super( 0);
    this.color = color;
  }

  public __generateDurations(): number[] {
    return [this.DEFAULT_BLINK_LENGTH_MS];
  }
}

// src/ui/screen-element-floating.ts
import { Container, BitmapText, TextOptions } from "pixi.js";
import Position from "../../game/position";
import Interface from "../interface";
import { PositionHelper } from "../../renderer/position-helper";

export default class FloatingElement {
  public container: Container;

  private __position: Position; // static world tile the float originates from
  private __start: number;
  private text: BitmapText;

  constructor(message: string, position: Position, color: number) {
    this.container = new Container();
    this.container.sortableChildren = true;
    this.__position = position.copy();
    this.text = new BitmapText({text: message, style: { fontFamily: "Tibia-Chat-22px", fontSize: 18 }} as TextOptions);
    this.text.anchor.set(0.5, 1); // center x, baseline y for upward float
    this.text.tint = Interface.prototype.getHexColor(color);
    (this.text as any).roundPixels = true;

    this.container.addChild(this.text);
    this.__start = performance.now();
  }

  public getAge(): number { return performance.now() - this.__start; }
  public getDuration(): number { return 20; }

  /** World-space placement on overlayLayer (same as CharacterElement). */
  public setTextPosition(): void {
    const { x, y, scale } = PositionHelper.getOverlayPosNonScaled(this.__position);
    const headGapPx = (Interface.TILE_SIZE - 6) * scale;
    this.container.scale.set(1);
    this.container.position.set(Math.round(x), Math.round(y - headGapPx ));

    // fade + scale over time
    this.container.alpha = this.getAge() > 500 ? Math.max(0, 1 - (this.getAge() - 500) / 250) : 1;
    const s = 2.0 - Math.min(this.getAge() / 600, 0.5);
    // NOTE: we already applied inverse scale to container; multiply the “effect scale”
    this.container.scale.set((1 / scale) * s, (1 / scale) * s);
  }

  public remove(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
  }
}

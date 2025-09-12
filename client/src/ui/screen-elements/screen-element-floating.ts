// src/ui/screen-elements/screen-element-floating.ts
import { Container, BitmapText, TextOptions } from "pixi.js";
import Position from "../../game/position";
import Interface from "../interface";
import { PositionHelper } from "../../renderer/position-helper";

export default class FloatingElement {
  public container: Container;

  private __position: Position;
  private __start: number;
  private text: BitmapText;

  // NEW
  private stackOffsetPx = 0;   // vertical stacking (screen px)
  private xJitterPx = 0;       // tiny horizontal jitter (screen px)

  constructor(message: string, position: Position, color: number) {
    this.container = new Container();
    this.container.sortableChildren = true;

    this.__position = position.copy();
    this.__start = performance.now();

    this.text = new BitmapText({
      text: message,
      style: { fontFamily: "Tibia-Chat-22px", fontSize: 16 }
    } as TextOptions);

    this.text.anchor.set(0.5, 1);
    this.text.tint = Interface.prototype.getHexColor(color);
    (this.text as any).roundPixels = true;

    this.container.addChild(this.text);
  }

  // NEW
  public setStackOffset(px: number): void {
    this.stackOffsetPx = px;
  }
  public setXJitter(px: number): void {
    this.xJitterPx = px;
  }

  private getAge(): number {
    return performance.now() - this.__start;
  }

  public getDuration(): number {
    // ~0.8s total – tweak if you want longer
    return 800;
  }

  public setTextPosition(): void {
    const { x, y, scale } = PositionHelper.getOverlayPosNonScaled(this.__position);

    const age = this.getAge();

    // Upward rise (on screen, so use scaled pixels for movement, then round)
    const rise = Math.min(40 * scale, age * 0.05 * scale); // 0.05 px/ms

    const screenX = Math.round(x + this.xJitterPx);
    const screenY = Math.round(y - rise - this.stackOffsetPx);

    this.container.scale.set(1); // text is on a non-scaling overlay
    this.container.position.set(screenX, screenY);

    // Fade & slight scale effect
    const fadeStart = 500;
    this.container.alpha = age < fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / 300);

    const grow = 2.0 - Math.min(age / 600, 0.5);
    this.container.scale.set(grow, grow);
  }

  public remove(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
  }
}

import GameClient from "./gameclient";
import Position from "./position";
import Interface from "./interface";
import ScreenElement from "./screen-element";

export default class FloatingElement extends ScreenElement {
  private __position: Position;
  private __start: number;

  constructor(message: string, position: Position, color: number) {
    // Call the parent constructor with the prototype identifier and gameClient.
    super( "floating-element-prototype");
    this.__position = position;
    this.setColor(color);
    this.setMessage(message);
    this.__start = performance.now();
  }

  /**
   * Returns the duration (in milliseconds or any unit) the element should appear.
   */
  public getDuration(): number {
    return 15;
  }

  /**
   * Returns the age (time elapsed) of the element.
   */
  public getAge(): number {
    return performance.now() - this.__start;
  }

  /**
   * Updates the text position based on the element's age and position.
   */
  public setTextPosition(): void {
    // Get a static screen position from the renderer using the element's position.
    const staticPos = window.gameClient.renderer.getStaticScreenPosition(this.__position);
    // Calculate the absolute offset (assume __getAbsoluteOffset is inherited).
    const offset = this.__getAbsoluteOffset(staticPos);
    const age = this.getAge();

    // Animate the text element upwards as it ages.
    offset.top -= Math.floor(0.05 * age);

    // Update opacity after 500ms.
    if (age > 500) {
      this.element.style.opacity = String(1 - ((age - 500) / 250));
    }

    // Update the element's position on screen (assume __updateTextPosition is inherited).
    this.__updateTextPosition(offset);
  }

  /**
   * Sets the text message of the floating element.
   */
  public setMessage(message: string): void {
    const span = this.element.querySelector("span");
    if (span) {
      span.innerHTML = message;
    }
  }

  /**
   * Sets the text color of the floating element.
   */
  public setColor(color: number): void {
    const span = this.element.querySelector("span") as HTMLElement | null;
    if (span) {
      span.style.color = Interface.prototype.getHexColor(color);
    }
  }
}

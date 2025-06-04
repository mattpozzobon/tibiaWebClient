import ScreenElement from "./screen-element";
import Interface from "../interface";
import Creature from "../../game/creature";
import Position from "../../game/position";


export default class MessageElement extends ScreenElement {
  __entity: Creature;
  private __position: Position;
  private __message: string;
  __color: number;

  constructor(entity: any, message: string, color: number) {
    // Call the parent constructor with gameClient and the prototype identifier.
    super( "message-element-prototype");
    
    this.__entity = entity;
    this.__position = entity.getPosition().copy();
    this.__message = message;
    this.__color = color;

    this.setMessage(message);
    this.setColor(color);
  }

  /**
   * Returns the duration the message element should remain on the screen.
   */
  public getDuration(): number {
    return 15 * Math.sqrt(this.__message.length);
  }

  /**
   * Sets the message of the element.
   */
  public setMessage(message: string): void {
    const spans = this.element.querySelectorAll("span");
    if (spans.length < 2) return;
    const nameElement = spans[0] as HTMLElement;
    const textElement = spans[1] as HTMLElement;
    nameElement.innerHTML = `<u>${this.__entity.getName()}</u>`;
    textElement.innerHTML = message;
  }

  /**
   * Sets the text color of the element.
   */
  public setColor(color: number): void {
    const spans = this.element.querySelectorAll("span");
    if (spans.length < 2) return;
    const nameElement = spans[0] as HTMLElement;
    const textElement = spans[1] as HTMLElement;
    textElement.style.color = Interface.prototype.getHexColor(color);
    nameElement.style.color = Interface.prototype.getHexColor(color);
  }

  /**
   * Updates the text position of the element based on its position.
   */
  public setTextPosition(): void {
    const staticPos = window.gameClient.renderer.getStaticScreenPosition(this.__position);
    const offset = this.__getAbsoluteOffset(staticPos);
    this.__updateTextPosition(offset);
  }
}

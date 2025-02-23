import ScreenElement from "./screen-element";
import GameClient from "./gameclient";
import Position from "./position";
import Interface from "./interface";

export default class MessageElement extends ScreenElement {
  gameClient: GameClient;
  __entity: any;
  private __position: Position;
  private __message: string;
  __color: number;

  constructor(gameClient: GameClient, entity: any, message: string, color: number) {
    // Call the parent constructor with gameClient and the prototype identifier.
    super(gameClient, "message-element-prototype");
    this.gameClient = gameClient;
    this.__entity = entity;
    this.__position = entity.__position.copy();
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
    nameElement.innerHTML = `<u>${this.__entity.name}</u>`;
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
    const staticPos = this.gameClient.renderer.getStaticScreenPosition(this.__position);
    const offset = this.__getAbsoluteOffset(staticPos);
    this.__updateTextPosition(offset);
  }
}

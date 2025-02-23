import GameClient from "./gameclient";
import Message from "./message";


export default class CharacterMessage extends Message {
  name: string;
  type: number;
  color: string;

  constructor(gameClient: GameClient, message: string, type: number, name: string, color: number) {
    super(gameClient, message, color);
    this.name = name;
    this.type = type;
    this.color = gameClient.interface.getHexColor(color);
  }

  /**
   * Formats the message using the inherited __formatTime method.
   */
  format(): string {
    // Assuming __formatTime is defined in the base Message class.
    return `${this.__formatTime()} ${this.name}: ${this.message}`;
  }

  /**
   * Creates a DOM node representing the message.
   */
  createNode(): HTMLElement {
    const span = document.createElement("span");
    span.className = "chat-message";
    span.style.color = this.color;
    span.innerHTML = this.format();

    if (this.type === 0) {
      span.setAttribute("name", this.name);
    }

    return span;
  }
}

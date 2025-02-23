import GameClient from "./gameclient";

export default class Message {
  message: string;
  color: string;
  private __time: Date;

  constructor(gameClient: GameClient, message: string, color: number) {
    this.message = message;
    this.color = gameClient.interface.getHexColor(color);
    this.__time = new Date();
  }

  /**
   * Formats the message for display.
   */
  public format(): string {
    return `${this.__formatTime()}: ${this.message}`;
  }

  /**
   * Creates the DOM node representing the message.
   */
  public createNode(): HTMLElement {
    const span = document.createElement("span");
    span.className = "chat-message";
    span.style.color = this.color;
    span.innerHTML = this.format();
    return span;
  }

  /**
   * Returns the formatted minute (with leading zero).
   */
  private __formatMinute(): string {
    return ("00" + this.__time.getMinutes()).slice(-2);
  }

  /**
   * Returns the formatted hour (with leading zero).
   */
  private __formatHour(): string {
    return ("0" + this.__time.getHours()).slice(-2);
  }

  /**
   * Returns the formatted time as "HH:MM".
   */
  public __formatTime(): string {
    return `${this.__formatHour()}:${this.__formatMinute()}`;
  }
}

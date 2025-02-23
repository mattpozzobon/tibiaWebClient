import Interface from "./interface";

export default class NotificationManager {
  private __internalTimeout: number | null;
  private __internalTimeoutServer: number | null;
  private __internalZoneTimeout: number | null;

  constructor() {
    this.__internalTimeout = null;
    this.__internalTimeoutServer = null;
    this.__internalZoneTimeout = null;
  }

  /**
   * Sets a zone message that displays for a limited time.
   * @param message - The main message text.
   * @param title - A secondary title text.
   */
  public setZoneMessage(message: string, title: string): void {
    const element = document.getElementById("zone-message");
    if (!element) return;

    element.style.display = "block";
    element.innerHTML = `&#128600 <span class='zone-title'>${message}</span> &#128602;<br><span class='zone-sub'>${title}</span>`;

    if (this.__internalZoneTimeout !== null) {
      clearTimeout(this.__internalZoneTimeout);
    }

    // Bind the deferServerMessage method to the element (so that "this" inside deferServerMessage is the element).
    this.__internalZoneTimeout = window.setTimeout(this.deferServerMessage.bind(element), 3000);
  }

  /**
   * Sets a cancel notification message that displays for a limited time.
   * @param message - The message text.
   */
  public setCancelMessage(message: string): void {
    const element = document.getElementById("notification");
    if (!element) return;

    element.innerHTML = message;

    if (this.__internalTimeout !== null) {
      clearTimeout(this.__internalTimeout);
    }

    this.__internalTimeout = window.setTimeout(this.deferCancel.bind(element), 3000);
  }

  /**
   * Sets a server notification message that displays for a limited time.
   * @param message - The message text.
   * @param color - A numeric color value used to determine the hex color.
   */
  public setServerMessage(message: string, color: number): void {
    const element = document.getElementById("server-message");
    if (!element) return;

    element.style.display = "block";
    // Using the getHexColor method from Interface's prototype.
    element.style.color = Interface.prototype.getHexColor(color);
    element.innerHTML = message;

    if (this.__internalTimeoutServer !== null) {
      clearTimeout(this.__internalTimeoutServer);
    }

    this.__internalTimeoutServer = window.setTimeout(this.deferServerMessage.bind(element), 3000);
  }

  /**
   * Removes the server notification from the DOM.
   * This method expects "this" to be bound to an HTMLElement.
   */
  public deferServerMessage(this: HTMLElement): void {
    this.style.display = "none";
  }

  /**
   * Clears the cancel notification from the DOM.
   * This method expects "this" to be bound to an HTMLElement.
   */
  public deferCancel(this: HTMLElement): void {
    this.innerHTML = "";
  }
}

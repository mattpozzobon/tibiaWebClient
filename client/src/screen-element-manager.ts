import GameClient from "./gameclient";
import FloatingElement from "./screen-element-floating";
import MessageElement from "./screen-element-message";

export default class ScreenElementManager {
  public activeTextElements: Set<FloatingElement | MessageElement>;
  public screenWrapper: HTMLElement;
  public gameClient: GameClient;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    this.activeTextElements = new Set();
    const wrapper = document.getElementById("text-wrapper");
    if (!wrapper) {
      throw new Error("Element with id 'text-wrapper' not found.");
    }
    this.screenWrapper = wrapper;
  }

  public clear(): void {
    // Remove all character elements from the DOM
    Object.values(this.gameClient.world.activeCreatures).forEach((creature: any) => {
      creature.characterElement.remove();
    });
  }

  public render(): void {
    // Render the character elements
    this.__renderCharacterElements();

    // Render other text bubbles on the screen
    this.activeTextElements.forEach((screenElement) => {
      // Only update the position of the text when it is floating or when the player moves
      if (this.gameClient.player!.isMoving() || screenElement.constructor.name === "FloatingElement") {
        screenElement.setTextPosition();
      }
    });
  }

  private __renderCharacterElements(): void {
    // Render floating name elements above the active creatures
    Object.values(this.gameClient.world.activeCreatures).forEach((creature: any) => {
      // Do not show the name element when on another floor
      if (this.gameClient.player!.getPosition().z !== creature.getPosition().z) {
        return creature.characterElement.hide();
      }
      // Do not waste time rendering creatures that are not visible
      if (!this.gameClient.player!.canSeeSmall(creature)) {
        return creature.characterElement.hide();
      }
      // Set color of nameplate for creatures other than the player
      if (creature !== this.gameClient.player) {
        if (this.gameClient.player!.getMaxFloor() > creature.getMaxFloor()) {
          creature.characterElement.setGrey();
        } else {
          creature.characterElement.setDefault();
        }
      }
      // Update the position of the name tag
      creature.characterElement.setTextPosition();
    });
  }

  public add(element: HTMLElement): void {
    this.screenWrapper.appendChild(element);
  }

  public createFloatingTextElement(message: string, position: any, color: number): any {
    if (document.hidden) {
      return null;
    }
    return this.__createTextElement(new FloatingElement(this.gameClient, message, position, color));
  }

  private __createTextElement(messageElement: FloatingElement | MessageElement): any {
    // Keep a reference to the active text element
    this.activeTextElements.add(messageElement);
    // Add the element to the screen wrapper
    this.add(messageElement.element);
    // Must update the position after appending to the parent
    messageElement.setTextPosition();
    // Schedule deletion after the element's duration expires
    const event = this.gameClient.eventQueue.addEvent(
      this.deleteTextElement.bind(this, messageElement),
      messageElement.getDuration()
    );
    return event;
  }

  public createTextElement(entity: any, message: string, color: number): any {
    // If the entity type is not 1, add the message to the default channel instead.
    if (entity.type !== 1) {
      this.gameClient.interface.channelManager.getChannel("Default")!.addMessage(message, entity.type, entity.name, color);
    }
    if (document.hidden) {
      return null;
    }
    return this.__createTextElement(new MessageElement(this.gameClient, entity, message, color));
  }

  public deleteTextElement(textElement: FloatingElement | MessageElement): void {
    // Remove the element from the DOM
    textElement.remove();
    // Delete its reference from active text elements
    this.activeTextElements.delete(textElement);

    // For MessageElement, if more text is buffered, create a new element with the next message.
    if (textElement instanceof MessageElement) {
      if (textElement.__entity.textBuffer.length === 0) {
        return;
      }
      this.createTextElement(
        textElement.__entity,
        textElement.__entity.textBuffer.shift(),
        textElement.__color
      );
    }
  }
}

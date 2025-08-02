import Creature from "../../game/creature";
import FloatingElement from "./screen-element-floating";
import MessageElement from "./screen-element-message";

export default class ScreenElementManager {
  public activeTextElements: Set<FloatingElement | MessageElement>;
  public screenWrapper: HTMLElement;
  private emoteDelays: Map<number, number> = new Map(); // creatureId → last delay in ms

  constructor() {
    this.activeTextElements = new Set();
    const wrapper = document.getElementById("text-wrapper");
    if (!wrapper) {
      throw new Error("Element with id 'text-wrapper' not found.");
    }
    this.screenWrapper = wrapper;
  }

  public clear(): void {
    // Remove all character elements from the DOM
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: any) => {
      //creature.characterElement.remove();
      window.gameClient.renderer.overlayLayer.removeChild(creature.characterElementPixi);
    });
  }

  public render(): void {
    // Render the character elements
    this.__renderCharacterElements();

    // Render other text bubbles on the screen
    this.activeTextElements.forEach((screenElement) => {
      // Only update the position of the text when it is floating or when the player moves
      if (window.gameClient.player!.isMoving() || screenElement.constructor.name === "FloatingElement") {
        screenElement.setTextPosition();
      }
    });
  }

  private __renderCharacterElements(): void {
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: Creature) => {
      if (window.gameClient.player!.getPosition().z !== creature.getPosition().z) {
        creature.characterElementPixi.visible = false;
        return;
      }
  
      if (!window.gameClient.player!.canSeeSmall(creature)) {
        creature.characterElementPixi.visible = false;
        return;
      }
  
      if (creature !== window.gameClient.player) {
        if (window.gameClient.player!.getMaxFloor() > creature.getMaxFloor()) {
          //creature.characterElementPixi.setHealthFraction(0);
        } else {
          //creature.characterElementPixi.setHealthFraction(creature.getHealthFraction());
        }
      }
  
      creature.characterElementPixi.render();
      creature.characterElementPixi.visible = true;
    });
  }

  public add(element: HTMLElement): void {
    this.screenWrapper.appendChild(element);
  }

  public createFloatingTextElement(message: string, position: any, color: number, creatureId?: number): void {
    if (document.hidden) return;
  
    let delay = 0;
    if (creatureId !== undefined) {
      const lastDelay = this.emoteDelays.get(creatureId) || 0;
      delay = lastDelay + 200; // Stagger by 100ms
      this.emoteDelays.set(creatureId, delay);
  
      // Reset the delay counter after a short time
      setTimeout(() => {
        const current = this.emoteDelays.get(creatureId);
        if (current === delay) {
          this.emoteDelays.delete(creatureId);
        }
      }, delay + 500);
    }
  
    setTimeout(() => {
      this.__createTextElement(new FloatingElement(message, position, color));
    }, delay);
  }

  private __createTextElement(messageElement: FloatingElement | MessageElement): any {
    // Keep a reference to the active text element
    this.activeTextElements.add(messageElement);
    // Add the element to the screen wrapper
    this.add(messageElement.element);
    // Must update the position after appending to the parent
    messageElement.setTextPosition();
    // Schedule deletion after the element's duration expires
    const event = window.gameClient.eventQueue.addEvent(
      this.deleteTextElement.bind(this, messageElement),
      messageElement.getDuration()
    );
    return event;
  }

  public createTextElement(entity: any, message: string, color: number): any {
    // If the entity type is not 1, add the message to the default channel instead.
    if (entity.type !== 1) {
      window.gameClient.interface.channelManager.getChannel("Default")!.addMessage(message, entity.type, entity.name, color);
    }
    if (document.hidden) {
      return null;
    }

    console.log('Creating text element:', entity, message, color);
    return this.__createTextElement(new MessageElement(entity, message, color));
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
        textElement.__entity.textBuffer.shift() || "",
        textElement.__color
      );
    }
  }
}

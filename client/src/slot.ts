import Canvas from "./canvas";
import GameClient from "./gameclient";
import Item from "./item";
import Position from "./position";

export default class Slot {
    gameClient: GameClient;
    item: Item | null;
    element!: HTMLElement;
    canvas!: Canvas;
  
    constructor(gameClient: GameClient) {
      /*
       * Class Slot
       * Container for a slot that contains an item
       */
      this.gameClient = gameClient;
      this.item = null;
    }
  
    setElement( element: HTMLElement): void {
      /*
       * Function Slot.setElement
       * Sets the elements in the DOM
       */
      
      this.element = element;
      this.canvas = new Canvas(this.gameClient, element.firstElementChild as HTMLCanvasElement, 32, 32);
    }
  
    createDOM(index: number): void {
      /*
       * Function Slot.createDOM
       * Creates the interactable DOM elements for the slot
       */
  
      let element = document.getElementById("slot-prototype")!.cloneNode(true) as HTMLElement;
      element.setAttribute("slotIndex", index.toString());
      element.removeAttribute("id");
  
      this.setElement(element);
    }
  
    setItem(item: Item | null): void {
      /*
       * Function Slot.setItem
       * Sets an item in the slot
       */
  
      this.item = item;
  
      // Update the class with the rarity color of the item
      this.element.className = "slot " + this.getRarityColor(item);
    }
  
    private getRarityColor(item: Item | null): string {
      /*
       * Function Slot.getRarityColor
       * Returns the rarity color of the slot
       */
  
      if (!item) return "";
  
      switch ((Math.random() * 5) | 0) {
        case 0:
          return "uncommon";
        case 1:
          return "rare";
        case 2:
          return "epic";
        case 3:
          return "legendary";
        case 4:
        default:
          return "";
      }
    }
  
    __renderAnimated(): void {
      /*
       * Function Slot.__renderAnimated
       * Renders the slot when it is animated
       */
  
      if (this.isEmpty()) {
        return;
      }
  
      this.render();
    }
  
    render(): void {
      /*
       * Function Slot.render
       * Renders the slot
       */
  
      // Clear the slot
      this.canvas.clear();
      this.setCountString(null);
  
      if (this.isEmpty()) {
        return;
      }
  
      // Draw the sprite to the slot canvas
      this.canvas.drawSprite(this.item!, new Position(0, 0, 0), 32);
  
      // If the item is stackable, update the count display
      if (this.item!.isStackable()) {
        this.setCountString(this.item!.getCount());
      }
    }
  
    private setCountString(count: number | null): void {
      /*
       * Function Slot.setCountString
       * Sets the count DOM element to the passed value
       */
  
      this.element.lastChild!.textContent = count !== null ? count.toString() : "";
    }
  
    isEmpty(): boolean {
      /*
       * Function Slot.isEmpty
       * Returns true if the slot is empty and does not contain an item
       */
  
      return this.item === null;
    }
  }
  
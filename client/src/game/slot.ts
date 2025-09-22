import Canvas from "../renderer/canvas";
import Item from "./item";
import Position from "./position";

export default class Slot {
    item: Item | null;
    element!: HTMLElement;
    canvas!: Canvas;
    slotId?: string;
    slotIndex?: number;
  
    constructor() {
      /*
       * Class Slot
       * Container for a slot that contains an item
       */
      
      this.item = null;
    }
  
    setElement( element: HTMLElement): void {
      /*
       * Function Slot.setElement
       * Sets the elements in the DOM
       */
      
      this.element = element;
      this.canvas = new Canvas(element.firstElementChild as HTMLCanvasElement, 32, 32);
    }
  
    createDOM(index: number): void {
      /*
       * Function Slot.createDOM
       * Creates the interactable DOM elements for the slot
       */
  
      // let element = document.getElementById("slot-prototype")!.cloneNode(true) as HTMLElement;
      // element.setAttribute("slotIndex", index.toString());
      // element.removeAttribute("id");
  
      // this.setElement(element);
    }
  
    setItem(item: Item | null): void {
      /*
       * Function Slot.setItem
       * Sets an item in the slot
       */
  
      this.item = item;
  
      // React component will handle visual updates including rarity colors
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
       * Renders the slot - React component handles visual rendering
       */
  
      // React component handles all visual rendering
      // This method is kept for compatibility but does nothing
    }
  
    private setCountString(count: number | null): void {
      /*
       * Function Slot.setCountString
       * Sets the count DOM element to the passed value - React component handles this
       */
  
      // React component handles count display
    }
  
    isEmpty(): boolean {
      /*
       * Function Slot.isEmpty
       * Returns true if the slot is empty and does not contain an item
       */
  
      return this.item === null;
    }
  }
  
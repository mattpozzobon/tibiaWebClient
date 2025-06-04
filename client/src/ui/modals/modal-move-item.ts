import Item from "../../game/item";
import Position from "../../game/position";
import Canvas from "../../renderer/canvas";
import Modal from "./modal";


export interface MoveItemModalProperties {
  item: { id: number; count: number };
  fromObject: any;
  toObject: any;
}

export default class MoveItemModal extends Modal {
  private __canvas: Canvas;
  private __slider: HTMLInputElement;
  private __output: HTMLElement;
  private __properties: MoveItemModalProperties | null;
  private __count: number | null;

  constructor(id: string) {
    super(id);
    

    // Create a canvas for the preview using the element with id "move-count-sprite"
    this.__canvas = new Canvas("move-count-sprite", 32, 32);

    // Get slider and output elements from the DOM.
    const slider = document.getElementById("item-amount") as HTMLInputElement | null;
    if (!slider) {
      throw new Error("Element with id 'item-amount' not found.");
    }
    this.__slider = slider;

    const output = document.getElementById("item-count");
    if (!output) {
      throw new Error("Element with id 'item-count' not found.");
    }
    this.__output = output;

    // Bind the slider input event to update the selected count.
    this.__slider.addEventListener("input", this.__changeSelectedCount.bind(this));

    // Initialize state properties.
    this.__properties = null;
    this.__count = null;
  }

  public handleOpen = (properties: MoveItemModalProperties): void => {
    // Focus the slider element.
    (document.getElementById("item-amount") as HTMLInputElement)?.focus();

    this.__properties = properties;
    this.__count = properties.item.count;

    // Set the slider's value and maximum based on the item's count.
    this.__slider.value = this.__slider.max = String(this.__count);

    this.__changeSelectedCount();
  }

  public handleConfirm = (): boolean => {
    // Write the move event to the server.
    window.gameClient.mouse.sendItemMove(
      this.__properties!.fromObject,
      this.__properties!.toObject,
      this.__count!
    );
    // Returning true will close the modal.
    return true;
  }

  private __redrawModal(): void {
    // Update the output element with the current count.
    this.__output.innerHTML = String(this.__count);

    // Create a temporary fake item with the updated count.
    const item = new Item(this.__properties!.item.id, this.__count!);

    // Clear the canvas and redraw the sprite.
    this.__canvas.clear();
    this.__canvas.drawSprite(item, new Position(0, 0, 0), 32);
  }

  private __changeSelectedCount(): void {
    let amount = Number(this.__slider.value);
    const max = Number(this.__slider.max);

    // If the shift key is down, adjust the amount in steps of 10.
    if (window.gameClient.keyboard.isShiftDown()) {
      if (amount !== max) {
        amount = Math.round(amount / 10) * 10;
      }
    }

    // Clamp the amount between 1 and max.
    this.__count = Math.min(Math.max(amount, 1), max);

    // Redraw the modal elements.
    this.__redrawModal();
  }
}

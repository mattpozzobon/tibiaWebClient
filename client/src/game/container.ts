import InteractiveWindow from "../ui/window/window";
import Item from "./item";
import Slot from "./slot";


export default class Container extends Item {
    private __containerId: number;
    size: number;
    slots: Slot[];
    window!: InteractiveWindow;
  
    constructor(properties: { id: number; cid: number; items: Item[] }) {
      /*
       * Class Container
       * Wrapper for a container on the DOM
       */
  
      super( properties.id, 0);
      // The number of slots in the container and its identifier
      this.__containerId = properties.cid;
      this.size = properties.items.length;
  
      // Create the slots for items to be added
      this.slots = [];
    }
  
    createDOM(title: string, items: Item[]): void {
      /*
       * Function Container.createDOM
       * Creates the DOM for the container - React components handle this
       */
      
      // React components handle DOM creation
      // Just initialize the slots
      this.createBodyContent(this.size);
      
      // Add the items to the slots
      this.addItems(items);
    }
  
    private createElement(index: number): HTMLElement {
      /*
       * Function Container.createElement
       * Creates a copy of the container prototype
       */
  
      let element = document.getElementById("container-prototype")!.cloneNode(true) as HTMLElement;
      element.style.display = "flex";
      element.setAttribute("containerIndex", index.toString());
      element.style.minHeight = "90px";
  
      return element;
    }
  
    close(): void {
      /*
       * Function Container.close
       * Callback fired when the container is closed
       */
  
      window.gameClient.player!.closeContainer(this);
    }
  
    peekItem(index: number): Item | null {
      return this.getSlotItem(index);
    }
  
    getSlot(index: number): Slot {
      return this.slots[index];
    }
  
    getSlotItem(index: number): Item | null {
      /*
       * Function Container.getSlotItem
       * Returns the item in the slot at a given index
       */
  
      if (index < 0 || index >= this.slots.length) {
        return null;
      }
  
      return this.getSlot(index).item;
    }
  
    private createBodyContent(size: number): void {
      /*
       * Function createBodyContent
       * Creates the model for the body that contains slots
       */
  
      // React components handle DOM creation
      for (let i = 0; i < size; i++) {
        let slot = new Slot();
        slot.slotIndex = i;
        this.slots.push(slot);
      }
    }
  
    addItems(items: Item[]): void {
      /*
       * Function Container.addItems
       * Adds an array of items to the container
       */
  
      items.forEach(this.addItem.bind(this));
    }
  
    addItem(item: Item | null, slot: number): void {
      /*
       * Function Container.addItem
       * Adds a single item to the container at a particular slot
       */
  
      if (!item) return;
  
      item.__parent = this;
  
      this.__setItem(slot, item);
      this.__render();
    }
  
    private __setItem(slot: number, item: Item | null): void {
      /*
       * Function Container.__setItem
       * Sets an item in the appropriate slot
       */
  
      this.slots[slot].setItem(item);
    }
  
    clearSlot(slot: number): void {
      /*
       * Function Container.clearSlot
       * Clears a particular slot in the container
       */
  
      this.__setItem(slot, null);
      this.getSlot(slot).render();
    }
  
    removeItem(slot: number, count: number): void {
      /*
       * Function Container.removeItem
       * Removes an item (optional count) from the given slot in the container
       */
  
      if (!this.slots[slot].item!.isStackable() || count === 0) {
        return this.clearSlot(slot);
      }
  
      this.slots[slot].item!.count -= count;
  
      if (this.slots[slot].item!.count === 0) {
        return this.clearSlot(slot);
      }
  
      this.getSlot(slot).render();
    }
  
    private __renderAnimated(): void {
      this.slots.forEach((slot) => {
        slot.__renderAnimated();
      });
    }
  
    private __render(): void {
      /*
       * Function Container.__render
       * Draws the container - React components handle visual rendering
       */
  
      // React components handle all visual rendering
      // This method is kept for compatibility but does nothing
    }
  }
  
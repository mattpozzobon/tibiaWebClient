import GameClient from "./gameclient";
import Item from "./item";
import Slot from "./slot";
import InteractiveWindow from "./window";

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
       * Creates the DOM for the container
       */
      let element = this.createElement(this.__containerId);
  
      this.window = new InteractiveWindow(element);
      this.window.addTo(document.getElementsByClassName("column")[0] as HTMLElement);
  
      // Attach a listener to the window close event to inform the server of container close
      this.window.on("close", this.close.bind(this));
      this.window.state.title = title.charAt(0).toUpperCase() + title.slice(1);
  
      // Adds the slots to the existing window body
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
  
      let body = this.window.getElement(".body") as HTMLElement;
  
      // Set a limit to the container height based on the number of slots
      body.style.maxHeight = Math.ceil(size / 4) * 34 + "px";
      body.style.minHeight = "40px";
      body.style.height = "100%";
  
      for (let i = 0; i < size; i++) {
        let slot = new Slot();
        slot.createDOM(i);
        if (this.__containerId === 2) {
          slot.element.style.backgroundImage = "url(png/icon-key.png)";
        }
        this.slots.push(slot);
      }
  
      this.slots.forEach((slot) => {
        body.appendChild(slot.element);
      });
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
      this.slots[slot].element.className = "slot";
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
       * Draws the container
       */
  
      this.slots.forEach((slot) => {
        slot.render();
      });
    }
  }
  
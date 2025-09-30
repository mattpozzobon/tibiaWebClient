import InteractiveWindow from "../ui/window/window";
import Item from "./item";
import Slot from "./slot";

export default class Container extends Item {
    public __containerId: number;
    size: number;
    slots: Slot[];
    window!: InteractiveWindow;
  
    constructor(properties: { id: number; cid: number; items: Item[]; size?: number }) {
      /*
       * Class Container
       * Wrapper for a container on the DOM
       */

      super( properties.id, 0);
      // The number of slots in the container and its identifier
      this.__containerId = properties.cid;
      // Use provided size or fall back to number of items
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
      
      // Dispatch container open event for UI
      this.dispatchContainerOpen(title);
    }
  
    close(): void {
      /*
       * Function Container.close
       * Callback fired when the container is closed
       */

      // Dispatch close event first
      this.dispatchContainerClose();
      
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

      // Ensure slots array is properly sized
      this.slots = new Array(size);
      
      // React components handle DOM creation
      for (let i = 0; i < size; i++) {
        let slot = new Slot();
        slot.slotIndex = i;
        this.slots[i] = slot; // Use direct assignment instead of push
      }
    }
  
    addItems(items: Item[]): void {
      /*
       * Function Container.addItems
       * Adds an array of items to the container
       */

      // Add items to their respective slots
      items.forEach((item, index) => {
        if (item && index < this.size) {
          this.addItem(item, index);
        }
      });
    }
  
    addItem(item: Item | null, slot: number): void {
      /*
       * Function Container.addItem
       * Adds a single item to the container at a particular slot
       */

      if (!item) return;

      item.__parent = this;

      this.__setItem(slot, item);
      
      // Dispatch event for UI updates
      this.dispatchItemChanged();
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
      
      // Dispatch event for UI updates
      this.dispatchItemChanged();
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
      
      // Dispatch event for UI updates
      this.dispatchItemChanged();
    }
  
    private __renderAnimated(): void {
      this.slots.forEach((slot) => {
        slot.__renderAnimated();
      });
    }

    private dispatchItemChanged(): void {
      /*
       * Function Container.dispatchItemChanged
       * Dispatches event when container items change
       */
      
      window.dispatchEvent(new CustomEvent('containerItemChanged', {
        detail: { containerId: this.__containerId }
      }));
    }

    private dispatchContainerOpen(title: string): void {
      /*
       * Function Container.dispatchContainerOpen
       * Dispatches event when container is opened
       */
      
      window.dispatchEvent(new CustomEvent('containerOpen', {
        detail: {
          containerId: this.__containerId,
          title: title
        }
      }));
    }

    dispatchContainerClose(): void {
      /*
       * Function Container.dispatchContainerClose
       * Dispatches event when container is closed
       */
      
      window.dispatchEvent(new CustomEvent('containerClose', {
        detail: { containerId: this.__containerId }
      }));
    }
  }
  
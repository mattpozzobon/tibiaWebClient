import InteractiveWindow from "../ui/window/window";
import Item from "./item";
import Slot from "./slot";

export default class Container extends Item {
    public __containerId: number;
    size: number;
    slots: Slot[];
    slotTypes: number[];
    window!: InteractiveWindow;
  
    constructor(properties: { id: number; cid: number; items: Item[]; size: number; slotTypes?: number[] }) {
      /*
       * Class Container
       * Wrapper for a container on the DOM
       */

      super( properties.id, 0);
      // The number of slots in the container and its identifier
      this.__containerId = properties.cid;
      // Use provided size or fall back to number of items
      this.size = properties.size;
      // Store slot types for exclusive slots
      this.slotTypes = properties.slotTypes || [];

      // Create the slots for items to be added
      this.slots = [];
    }

    // Override methods that require sprite data to avoid errors
    getFrameGroup(group: number): any {
      // Containers don't have frame groups, return a safe default
      return { animationLength: 1, animationLengths: [{ min: 500, max: 500 }] };
    }

    isAnimated(): boolean {
      // Containers are not animated
      return false;
    }

    getDataObject(): any {
      // Return a safe default data object for containers
      return {
        frameGroups: [{ animationLength: 1, animationLengths: [{ min: 500, max: 500 }] }],
        flags: new Map(),
        properties: {}
      };
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
  
    addItems(items: (Item | null)[]): void {
      /*
       * Function Container.addItems
       * Adds an array of items to the container
       */

      // Process all slots, including empty ones
      for (let i = 0; i < this.size; i++) {
        const item = items[i];
        if (item) {
          this.addItem(item, i);
        } else {
          // Clear the slot if item is null
          this.clearSlot(i);
        }
      }
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

      if (slot < 0 || slot >= this.slots.length) {
        return;
      }

      this.__setItem(slot, null);
      
      // Only render if slot exists
      const slotObj = this.getSlot(slot);
      if (slotObj) {
        slotObj.render();
      }
      
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
        detail: { containerId: this.id } // Use GUID instead of client ID
      }));
    }

    private dispatchContainerOpen(title: string): void {
      /*
       * Function Container.dispatchContainerOpen
       * Dispatches event when container is opened
       */
      
      window.dispatchEvent(new CustomEvent('containerOpen', {
        detail: {
          containerId: this.id, // Use GUID instead of client ID
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
        detail: { containerId: this.id } // Use GUID instead of client ID
      }));
    }
  }
  
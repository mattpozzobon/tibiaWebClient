import Container from "../../container";
import Item from "../../item";
import Slot from "../../slot";

export default class Equipment extends Container {
  public slots: Slot[];
  public BACKGROUNDS: string[];

  constructor(items: any) {
    // Call the parent constructor with an object containing id, cid, and items with a length of 10.
    super( { id: 0, cid: 0, items: new Array<Item>(10) });
    
    // The equipment has ten slots for items.
    this.slots = [
      this.createSlot(0, "head-slot"),
      this.createSlot(1, "armor-slot"),
      this.createSlot(2, "legs-slot"),
      this.createSlot(3, "boots-slot"),
      this.createSlot(4, "right-slot"),
      this.createSlot(5, "left-slot"),
      this.createSlot(6, "backpack-slot"),
      this.createSlot(7, "shoulder-slot"),
      this.createSlot(8, "ring-slot"),
      this.createSlot(9, "quiver-slot")
    ];

    this.BACKGROUNDS = [
      "./png/head.png",
      "./png/armor.png",
      "./png/legs.png",
      "./png/boots.png",
      "./png/right.png",
      "./png/left.png",
      "./png/backpack.png",
      "./png/item.png",
      "./png/item.png",
      "./png/item.png"
    ];

    this.setItems(items);
  }

  public removeItem(slot: number, count: number): any {
    // If the item is not stackable or count is zero, clear the slot.
    if (!this.slots[slot].item!.isStackable() || count === 0) {
      return this.clearSlot(slot);
    }
    // Subtract the count.
    this.slots[slot].item!.count -= count;
    // If the remaining count is zero, clear the slot.
    if (this.slots[slot].item!.count === 0) {
      return this.clearSlot(slot);
    }
    // Render the slot.
    this.getSlot(slot).render();
  }

  public setItems(items: any[]): void {
    // Ensure the provided items array has the same length as slots.
    if (items.length !== this.slots.length) {
      return;
    }
    items.forEach((item, index) => {
      if (item !== null) {
        this.addItem(item, index);
      }
    });
  }

  public createSlot(index: number, id: string): Slot {
    // Create a new Slot - DOM element will be set by React component
    const slot = new Slot();
    slot.slotId = id;
    slot.slotIndex = index;
    return slot;
  }

  public addItem(item: any, slot: number): void {
    this.equipSlot(slot, item);
    this.render();
  }

  public equipSlot(slot: number, item: any): void {
    this.slots[slot].setItem(item);
    // React component will handle visual updates
  }

  public render(): void {
    // Render each slot.
    //this.slots.forEach(slot => slot.render());
  }
}

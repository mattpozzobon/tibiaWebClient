// equipment.ts
import { Emitter, Unsubscribe } from "../../../utils/event-emitter";
import Container from "../../container";
import Item from "../../item";
import Slot from "../../slot";


export type EquipmentEvents = {
  READY: void;
  CHANGED: { slot: number | null; item: Item | null };
};

export default class Equipment extends Container {
  public slots: Slot[];
  private emitter = new Emitter<EquipmentEvents>();

  constructor(items: any) {
    super({ id: 0, cid: 0, items: new Array<Item>(15), size: 15 });

    // create slots and wrap setItem so *any* mutation emits
    this.slots = [
      this.createSlot(0, "helmet-slot"),      // HELMET
      this.createSlot(1, "armor-slot"),       // ARMOR
      this.createSlot(2, "legs-slot"),        // LEGS
      this.createSlot(3, "boots-slot"),       // BOOTS
      this.createSlot(4, "right-slot"),       // RIGHT
      this.createSlot(5, "left-slot"),        // LEFT
      this.createSlot(6, "backpack-slot"),    // BACKPACK
      this.createSlot(7, "necklace-slot"),    // NECKLACE
      this.createSlot(8, "ring-slot"),        // RING
      this.createSlot(9, "quiver-slot"),      // QUIVER
      this.createSlot(10, "ring2-slot"),      // RING2
      this.createSlot(11, "ring3-slot"),      // RING3
      this.createSlot(12, "ring4-slot"),      // RING4
      this.createSlot(13, "ring5-slot"),      // RING5
      this.createSlot(14, "belt-slot"),       // BELT
    ].map((slot, idx) => {
      const orig = slot.setItem.bind(slot);
      slot.setItem = (item: Item | null) => {
        orig(item);
        this.emitter.emit("CHANGED", { slot: idx, item });
      };
      return slot;
    });

    this.setItems(items);
  }

  // typed listeners
  onReady(fn: () => void): Unsubscribe { return this.emitter.on("READY", fn); }
  onChanged(fn: (p: { slot: number | null; item: Item | null }) => void): Unsubscribe {
    return this.emitter.on("CHANGED", fn);
  }

  // lifecycle / mutations
  public setItems(items: any): void {
    const list = this.normalize(items);
    for (let i = 0; i < this.slots.length; i++) {
      const item = this.coerceItem(list[i] ?? null);
      this.slots[i].setItem(item); // will emit CHANGED per slot
    }
    requestAnimationFrame(() => this.emitter.emit("READY", undefined));
  }

  public addItem(item: any, slot: number): void {
    this.slots[slot].setItem(this.coerceItem(item)); // emits
  }

  public equipSlot(slot: number, item: Item | null): void {
    this.slots[slot].setItem(item); // emits
  }

  public override clearSlot(slot: number): void {
    super.clearSlot(slot); // Slot.setItem(null) already emitted via wrapper above
    // no extra emit needed
  }

  // helpers
  public createSlot(index: number, id: string): Slot {
    const s = new Slot();
    s.slotId = id;
    s.slotIndex = index;
    return s;
  }

  private coerceItem(raw: any): Item | null {
    if (!raw) return null;
    if (raw instanceof Item) return raw;
    if (typeof raw.id === "number") {
      const count = typeof raw.count === "number" ? raw.count : 1;
      const itm = new Item(raw.id, count);
      itm.setParent(this);
      return itm;
    }
    return null;
  }

  private normalize(input: any): any[] {
    if (Array.isArray(input)) return input;
    if (input && Array.isArray(input.items)) return input.items;
    const arr = new Array(15).fill(null);
    Object.keys(input || {}).forEach((k) => {
      const i = Number(k);
      if (!Number.isNaN(i) && i >= 0 && i < 15) arr[i] = input[k];
    });
    return arr;
  }
}

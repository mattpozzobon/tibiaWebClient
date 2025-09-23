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
    super({ id: 0, cid: 0, items: new Array<Item>(10) });

    // create slots and wrap setItem so *any* mutation emits
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
      this.createSlot(9, "quiver-slot"),
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
    console.log('🔧 Equipment.setItems called with:', items);
    const list = this.normalize(items);
    console.log('🔧 Normalized list:', list);
    for (let i = 0; i < this.slots.length; i++) {
      const item = this.coerceItem(list[i] ?? null);
      console.log(`🔧 Setting slot ${i} with item:`, item);
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
    const arr = new Array(10).fill(null);
    Object.keys(input || {}).forEach((k) => {
      const i = Number(k);
      if (!Number.isNaN(i) && i >= 0 && i < 10) arr[i] = input[k];
    });
    return arr;
  }
}

import Container from "../../container";
import Item from "../../item";
import Slot from "../../slot";

export const EQUIPMENT_EVENTS = {
  READY: "equipment:ready",
  CHANGED: "equipment:changed",
} as const;

type EquipInit =
  | Array<any>                               // [ {id,count}? | null, ... ]
  | { items: any[] }                         // { items: [...] }
  | Record<string | number, any>;            // { "0": {...}, 1: {...} }

export default class Equipment extends Container {
  public slots: Slot[];
  public BACKGROUNDS: string[];
  public isReady = false;

  private evt = new EventTarget();

  constructor(items: EquipInit) {
    super({ id: 0, cid: 0, items: new Array<Item>(10) });

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
    ];

    this.BACKGROUNDS = [
      "./png/head.png", "./png/armor.png", "./png/legs.png", "./png/boots.png",
      "./png/right.png","./png/left.png","./png/backpack.png",
      "./png/item.png","./png/item.png","./png/item.png",
    ];

    this.setItems(items);
  }

  // ----- events -----
  on(type: string, fn: EventListener) {
    this.evt.addEventListener(type, fn);
    return () => this.off(type, fn);
  }
  off(type: string, fn: EventListener) {
    this.evt.removeEventListener(type, fn);
  }
  private emit(type: string, detail?: any) {
    this.evt.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // ----- lifecycle / mutations -----
  public setItems(input: EquipInit): void {
    const list = this.normalize(input);
    for (let i = 0; i < this.slots.length; i++) {
      const raw = list[i] ?? null;
      const itm = this.coerceItem(raw);
      this.assignSlot(i, itm);
    }
    this.isReady = true;
    // Defer READY until after React likely mounted the panel
    requestAnimationFrame(() => this.emit(EQUIPMENT_EVENTS.READY));
  }

  public addItem(item: any, slot: number): void {
    this.equipSlot(slot, this.coerceItem(item));
  }

  public equipSlot(slot: number, item: Item | null): void {
    this.assignSlot(slot, item);
    this.emit(EQUIPMENT_EVENTS.CHANGED, { slot, item });
  }

  // IMPORTANT: emit when base logic clears a slot (e.g., move to inventory)
  public override clearSlot(slot: number): void {
    super.clearSlot(slot);
    this.emit(EQUIPMENT_EVENTS.CHANGED, { slot, item: null });
  }

  // Keep the base remove logic, but reflect changes via event as well
  public override removeItem(slot: number, count: number): any {
    const before = this.slots[slot]?.item ?? null;
    super.removeItem(slot, count);
    const after = this.slots[slot]?.item ?? null;
    if (before !== after) {
      this.emit(EQUIPMENT_EVENTS.CHANGED, { slot, item: after });
    }
  }

  public createSlot(index: number, id: string): Slot {
    const s = new Slot();
    s.slotId = id;
    s.slotIndex = index;
    return s;
  }

  // ----- helpers (no name clash with Container.__setItem) -----
  private assignSlot(slot: number, item: Item | null) {
    this.slots[slot].setItem(item);
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

  private normalize(input: EquipInit): any[] {
    // Accept several server payload shapes
    if (Array.isArray(input)) return input;
    if (input && Array.isArray((input as any).items)) return (input as any).items;

    // Object map { "0": {...}, "1": {...} }
    const arr = new Array(10).fill(null);
    Object.keys(input || {}).forEach((k) => {
      const idx = Number(k);
      if (!Number.isNaN(idx) && idx >= 0 && idx < 10) {
        (arr as any[])[idx] = (input as any)[k];
      }
    });
    return arr;
  }
}

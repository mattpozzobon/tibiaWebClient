// src/ui/screen-elements/screen-element-manager.ts
import { Container } from "pixi.js";
import Creature from "../../game/creature";
import FloatingElement from "./screen-element-floating";
import MessageElement from "./screen-element-message";
import Renderer from "../../renderer/renderer";

type BurstState = { t: number; count: number };

export default class ScreenElementManager {
  private layer: Container;
  public activeTextElements = new Set<FloatingElement | MessageElement>();

  // Per-creature stacks
  private messagesByEntity = new Map<number, MessageElement[]>();
  private floatsByEntity   = new Map<number, FloatingElement[]>();

  // Per-creature burst bookkeeping
  private msgBurst = new Map<number, BurstState>();
  private dmgBurst = new Map<number, BurstState>();

  // Tweakables
  private readonly BURST_WINDOW_MS = 60; // same-timestamp window
  private readonly MSG_LINE = 18;        // px between chat messages (screen px)
  private readonly DMG_LINE = 14;        // px between damage numbers (screen px)
  private readonly JITTER = [ -4, -2, 0, 2, 4 ]; // small X offsets

  constructor(private renderer: Renderer) {
    this.layer = renderer.noScallingOverlayLayer;
    this.layer.sortableChildren = true;
  }

  clear(): void {
    for (const el of this.activeTextElements) el.remove();
    this.activeTextElements.clear();
    this.messagesByEntity.clear();
    this.floatsByEntity.clear();
    this.msgBurst.clear();
    this.dmgBurst.clear();
    this.layer.removeChildren();
  }

  render(): void {
    // Nameplates
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: Creature) => {
      if (window.gameClient.player!.getPosition().z !== creature.getPosition().z
       || !window.gameClient.player!.canSeeSmall(creature)) {
        creature.characterElementPixi.visible = false;
      } else {
        creature.characterElementPixi.render();
        creature.characterElementPixi.visible = true;
      }
    });

    // Update all elements
    this.activeTextElements.forEach(el => el.setTextPosition());
  }

  private addToLayer(el: FloatingElement | MessageElement): void {
    const container = (el as any).container;
    if (!container) throw new Error("Element must expose a Pixi `container`.");
    this.layer.addChild(container);
  }

  private __createTextElement(el: FloatingElement | MessageElement): any {
    this.activeTextElements.add(el);
    this.addToLayer(el);
    el.setTextPosition();
    return window.gameClient.eventQueue.addEvent(
      this.deleteTextElement.bind(this, el),
      el.getDuration()
    );
  }

  private nextBurstIndex(map: Map<number, BurstState>, id: number): number {
    const now = performance.now();
    const state = map.get(id);
    if (!state || now - state.t > this.BURST_WINDOW_MS) {
      map.set(id, { t: now, count: 0 });
      return 0;
    }
    state.count += 1;
    state.t = now;
    return state.count;
  }

  private restackMessages(id: number): void {
    const list = this.messagesByEntity.get(id) || [];
    for (let i = 0; i < list.length; i++) list[i].setStackOffset(i * this.MSG_LINE);
  }

  private restackDamage(id: number): void {
    const list = this.floatsByEntity.get(id) || [];
    // Only restack the *currently alive* floats, newest on top
    for (let i = 0; i < list.length; i++) list[i].setStackOffset(i * this.DMG_LINE);
  }

  /** Damage-style floating numbers (can burst). */
  public createFloatingElement(creature: Creature, message: string, color: number): any {
    if (document.hidden) return null;

    const id = (creature as any).id as number;
    if (typeof id !== "number") return null;

    const el = new FloatingElement(message, creature.getPosition(), color);

    // Burst logic for damage numbers
    const idx = this.nextBurstIndex(this.dmgBurst, id);

    // Jitter selection (tiny horizontal offset)
    el.setXJitter(this.JITTER[idx % this.JITTER.length]);

    // Add to per-entity list and restack
    const list = this.floatsByEntity.get(id) || [];
    list.unshift(el); // newest first (appears on top)
    this.floatsByEntity.set(id, list);
    this.restackDamage(id);

    return this.__createTextElement(el);
  }

  /** Chat-style lines above head (stack downward/upward consistently). */
  public createFloatingTextElement(message: string, entity: Creature, color: number): any {
    if (document.hidden) return null;

    const id = (entity as any).id as number;
    if (typeof id !== "number") return null;

    const el = new MessageElement(entity, message, color);

    // Burst logic for chat lines (optional; keeps multiple same-tick lines readable)
    const idx = this.nextBurstIndex(this.msgBurst, id);
    el.setStackOffset(idx * this.MSG_LINE);

    const list = this.messagesByEntity.get(id) || [];
    list.push(el);
    this.messagesByEntity.set(id, list);

    // Normalize final stacking
    this.restackMessages(id);

    return this.__createTextElement(el);
  }

  public deleteTextElement(el: FloatingElement | MessageElement): void {
    el.remove();
    this.activeTextElements.delete(el);

    if (el instanceof MessageElement) {
      const id = (el.__entity as any).id as number;
      const list = this.messagesByEntity.get(id);
      if (list) {
        const idx = list.indexOf(el);
        if (idx !== -1) list.splice(idx, 1);
        if (list.length === 0) this.messagesByEntity.delete(id);
        else this.restackMessages(id);
      }
      return;
    }

    if (el instanceof FloatingElement) {
      // Remove from damage list too
      // (we duck-type because we don’t keep a back reference)
      const guess = Array.from(this.floatsByEntity.entries());
      for (const [id, list] of guess) {
        const idx = list.indexOf(el);
        if (idx !== -1) {
          list.splice(idx, 1);
          if (list.length === 0) this.floatsByEntity.delete(id);
          else this.restackDamage(id);
          break;
        }
      }
    }
  }
}

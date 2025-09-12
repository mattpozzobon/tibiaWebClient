// src/ui/screen-elements/screen-element-manager.ts
import { Container } from "pixi.js";
import Creature from "../../game/creature";
import FloatingElement from "./screen-element-floating";
import MessageElement from "./screen-element-message";
import Renderer from "../../renderer/renderer";
import CharacterElement from "./screen-element-character";

type BurstState = { t: number; count: number };

// src/ui/screen-elements/screen-element-manager.ts
export default class ScreenElementManager {
  private nameplateLayer: Container;      // world-scaled
  private textLayer: Container;           // screen-space (no scaling)

  public activeTextElements = new Set<FloatingElement | MessageElement>();
  private messagesByEntity = new Map<number, MessageElement[]>();
  private floatsByEntity   = new Map<number, FloatingElement[]>();
  private msgBurst = new Map<number, {t:number;count:number}>();
  private dmgBurst = new Map<number, {t:number;count:number}>();

  private readonly BURST_WINDOW_MS = 60;
  private readonly MSG_LINE = 18;
  private readonly DMG_LINE = 14;
  private readonly JITTER = [-4,-2,0,2,4];

  constructor(private renderer: Renderer) {
    this.nameplateLayer = renderer.overlayLayer;           // ✅ CharacterElement here
    this.textLayer      = renderer.noScallingOverlayLayer; // ✅ Text here
    this.nameplateLayer.sortableChildren = true;
    this.textLayer.sortableChildren      = true;
  }

  private ensureCharacterElement(creature: Creature) {
    if (!creature.characterElementPixi) {
      creature.characterElementPixi = new CharacterElement(creature);
      creature.characterElementPixi.attachTo(this.nameplateLayer);
    } else if (creature.characterElementPixi.parent !== this.nameplateLayer) {
      creature.characterElementPixi.attachTo(this.nameplateLayer);
    }
  }

  clear(): void {
    // destroy nameplates
    Object.values(window.gameClient.world.activeCreatures).forEach((c: any) => {
      if (c.characterElementPixi) {
        c.characterElementPixi.destroy({ children: true });
        c.characterElementPixi = undefined;
      }
    });
    // clear texts
    for (const el of this.activeTextElements) el.remove();
    this.activeTextElements.clear();
    this.messagesByEntity.clear();
    this.floatsByEntity.clear();
    this.msgBurst.clear();
    this.dmgBurst.clear();
    this.nameplateLayer.removeChildren();
    this.textLayer.removeChildren();
  }

  render(): void {
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: Creature) => {
      this.ensureCharacterElement(creature);
      if (window.gameClient.player!.getPosition().z !== creature.getPosition().z
       || !window.gameClient.player!.canSeeSmall(creature)) {
        creature.characterElementPixi!.visible = false;
      } else {
        creature.characterElementPixi!.render();
        creature.characterElementPixi!.visible = true;
      }
    });

    // texts
    this.activeTextElements.forEach(el => el.setTextPosition());
  }

  private addToTextLayer(el: FloatingElement | MessageElement) {
    const container = (el as any).container;
    if (!container) throw new Error("Element must expose a Pixi `container`.");
    if (container.parent !== this.textLayer) this.textLayer.addChild(container);
  }

  private __createTextElement(el: FloatingElement | MessageElement): any {
    this.activeTextElements.add(el);
    this.addToTextLayer(el);
    el.setTextPosition();
    return window.gameClient.eventQueue.addEvent(
      this.deleteTextElement.bind(this, el),
      el.getDuration()
    );
  }

  private nextBurstIndex(map: Map<number,{t:number;count:number}>, id: number) {
    const now = performance.now();
    const s = map.get(id);
    if (!s || now - s.t > this.BURST_WINDOW_MS) {
      map.set(id, { t: now, count: 0 });
      return 0;
    }
    s.count += 1; s.t = now; return s.count;
  }

  private restackMessages(id: number) {
    const list = this.messagesByEntity.get(id) || [];
    for (let i = 0; i < list.length; i++) list[i].setStackOffset(i * this.MSG_LINE);
  }
  private restackDamage(id: number) {
    const list = this.floatsByEntity.get(id) || [];
    for (let i = 0; i < list.length; i++) list[i].setStackOffset(i * this.DMG_LINE);
  }

  // damage float
  public createFloatingElement(creature: Creature, message: string, color: number) {
    if (document.hidden) return null;
    const id = (creature as any).id as number;
    if (typeof id !== "number") return null;

    const el = new FloatingElement(message, creature.getPosition(), color);
    const idx = this.nextBurstIndex(this.dmgBurst, id);
    el.setXJitter(this.JITTER[idx % this.JITTER.length]);

    const list = this.floatsByEntity.get(id) || [];
    list.unshift(el);
    this.floatsByEntity.set(id, list);
    this.restackDamage(id);

    return this.__createTextElement(el);
  }

  // chat line
  public createFloatingTextElement(message: string, entity: Creature, color: number) {
    if (document.hidden) return null;
    const id = (entity as any).id as number;
    if (typeof id !== "number") return null;

    const el = new MessageElement(entity, message, color);
    const idx = this.nextBurstIndex(this.msgBurst, id);
    el.setStackOffset(idx * this.MSG_LINE);

    const list = this.messagesByEntity.get(id) || [];
    list.push(el);
    this.messagesByEntity.set(id, list);
    this.restackMessages(id);

    return this.__createTextElement(el);
  }

  public deleteTextElement(el: FloatingElement | MessageElement) {
    el.remove();
    this.activeTextElements.delete(el);

    if (el instanceof MessageElement) {
      const id = (el.__entity as any).id as number;
      const list = this.messagesByEntity.get(id);
      if (list) {
        const i = list.indexOf(el);
        if (i !== -1) list.splice(i, 1);
        if (list.length === 0) this.messagesByEntity.delete(id);
        else this.restackMessages(id);
      }
      return;
    }

    // floating damage
    for (const [id, list] of this.floatsByEntity) {
      const i = list.indexOf(el as any);
      if (i !== -1) {
        list.splice(i, 1);
        if (list.length === 0) this.floatsByEntity.delete(id);
        else this.restackDamage(id);
        break;
      }
    }
  }
}
// src/ui/screen-elements/screen-element-manager.ts
import { Container } from "pixi.js";
import Creature from "../../game/creature";
import FloatingElement from "./screen-element-floating";
import MessageElement from "./screen-element-message";
import Renderer from "../../renderer/renderer";

export default class ScreenElementManager {
  private layer: Container;
  public activeTextElements = new Set<FloatingElement | MessageElement>();
  private messagesByEntity = new Map<number, MessageElement[]>();

  constructor(private renderer: Renderer) {
    this.layer = renderer.noScallingOverlayLayer;
    this.layer.sortableChildren = true;
  }

  clear(): void {
    for (const el of this.activeTextElements) el.remove();
    this.activeTextElements.clear();
    this.messagesByEntity.clear();
    this.layer.removeChildren();
  }

  render(): void {
    Object.values(window.gameClient.world.activeCreatures).forEach((creature: Creature) => {
      if (window.gameClient.player!.getPosition().z !== creature.getPosition().z
       || !window.gameClient.player!.canSeeSmall(creature)) {
        creature.characterElementPixi.visible = false;
      } else {
        creature.characterElementPixi.render();
        creature.characterElementPixi.visible = true;
      }
    });
    this.activeTextElements.forEach(el => el.setTextPosition());
  }

  private addToLayer(el: FloatingElement | MessageElement): void {
    const container = (el as any).container;
    if (!container) throw new Error("Element must expose a Pixi `container`.");
    this.layer.addChild(container);
  }

  private restackEntityMessages(entityId: number): void {
    const arr = this.messagesByEntity.get(entityId) || [];
    const line = 18; // world-pixel spacing between stacked messages
    for (let i = 0; i < arr.length; i++) arr[i].setStackOffset(i * line);
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

  // ✅ Keep the legacy signature so existing callers work
  public createFloatingTextElement(message: string, entity: Creature, color: number): any {
    if (document.hidden) return null;

    const id = (entity as any).id as number;
    if (typeof id !== "number") throw new Error("Creature.id must be a number for stacking.");

    // Always create a NEW MessageElement (no reuse, no buffer)
    const el = new MessageElement(entity, message, color);

    const list = this.messagesByEntity.get(id) || [];
    list.push(el);
    this.messagesByEntity.set(id, list);

    // position in the stack
    this.restackEntityMessages(id);

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
        else this.restackEntityMessages(id);
      }
    }
  }
}

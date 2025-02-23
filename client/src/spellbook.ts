import GameClient from "./gameclient";
import HeapEvent from "./heap-event";
import SpellbookModal from "./modal-spellbook";
import { SpellCastPacket } from "./protocol";

export default class Spellbook {
  public spells: Set<number>;
  public cooldowns: Map<number, HeapEvent>;
  public GLOBAL_COOLDOWN: number = 0xFFFF;
  public GLOBAL_COOLDOWN_DURATION: number = 20;
  private gameClient: GameClient;

  constructor(gameClient: GameClient, spells: number[]) {
    this.gameClient = gameClient;
    this.spells = new Set(spells);
    this.cooldowns = new Map<number, HeapEvent>();

    // Create the spell list in the modal.
    (this.gameClient.interface.modalManager.get("spellbook-modal") as SpellbookModal).createSpellList(Array.from(this.spells));
    this.gameClient.interface.hotbarManager.__loadConfiguration();
  }

  public addSpell(sid: number): void {
    this.spells.add(sid);
    (this.gameClient.interface.modalManager.get("spellbook-modal") as SpellbookModal).createSpellList(Array.from(this.spells));
  }

  public removeSpell(sid: number): void {
    this.spells.delete(sid);
    (this.gameClient.interface.modalManager.get("spellbook-modal") as SpellbookModal).createSpellList(Array.from(this.spells));
  }

  public castSpell(sid: number): void {
    if (this.cooldowns.has(this.GLOBAL_COOLDOWN) || this.cooldowns.has(sid)) {
      return this.__cooldownCallback();
    }
    this.gameClient.send(new SpellCastPacket(sid));
  }

  public serverCastSpell(packet: { id: number; cooldown: number }): void {
    this.__lockSpell(packet.id, packet.cooldown);
  }

  public getCooldownSeconds(sid: number): number {
    const gcdf = this.cooldowns.has(this.GLOBAL_COOLDOWN)
      ? this.cooldowns.get(this.GLOBAL_COOLDOWN)!.remainingSeconds()
      : 0;
    if (!this.cooldowns.has(sid)) {
      return gcdf;
    }
    return Math.max(gcdf, this.cooldowns.get(sid)!.remainingSeconds());
  }

  public getCooldownFraction(sid: number): number {
    const gcdf = this.cooldowns.has(this.GLOBAL_COOLDOWN)
      ? (1 - this.cooldowns.get(this.GLOBAL_COOLDOWN)!.remainingFraction())
      : 1;
    if (!this.cooldowns.has(sid)) {
      return gcdf;
    }
    return Math.min(gcdf, 1 - this.cooldowns.get(sid)!.remainingFraction());
  }

  private __cooldownCallback(): void {
    this.gameClient.player!.blockHit();
    this.gameClient.interface.setCancelMessage("You cannot cast this spell yet.");
  }

  private __lockSpell(id: number, time: number): void {
    this.cooldowns.set(
      id,
      this.gameClient.eventQueue.addEvent(this.__unlockSpell.bind(this, id), time) as HeapEvent
    );
    this.cooldowns.set(
      this.GLOBAL_COOLDOWN,
      this.gameClient.eventQueue.addEvent(this.__unlockSpell.bind(this, this.GLOBAL_COOLDOWN), this.GLOBAL_COOLDOWN_DURATION) as HeapEvent
    );
  }

  private __unlockSpell(id: number): void {
    this.cooldowns.delete(id);
  }
}

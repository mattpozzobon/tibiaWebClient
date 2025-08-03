import Equipment from "./equipment/equipment";
import Friendlist from "./friendList/friendlist";
import { ContainerClosePacket } from "../../core/protocol";
import Skills from "./skills/skills";
import Spellbook from "./spellbook/spellbook";
import Creature, { CreatureData } from "../creature";
import ConditionManager from "../condition";
import SkillModal from "../../ui/modals/modal-skills";
import BattleWindow from "../../ui/window/window-battle";
import CharacterPixiElement from "../../ui/screen-elements/screen-element-characther-pixi";

export interface PlayerData extends CreatureData {
  equipment: any;
  spellbook: any;
  friendlist: any;
  skills: any;
  mounts: any;
  outfits: any;
  vitals: any;
}

export default class Player extends Creature {
  public equipment: Equipment;
  public spellbook: Spellbook;
  public friendlist: Friendlist;

  public skills: Skills;
  public mounts: any;
  public outfits: any;

  // Private state for the player
  __movementEvent: any = null;
  __target: any = null;
  __movementBuffer: any = null;
  __openedContainers: Set<any> = new Set();
  __serverWalkConfirmation: boolean = true;

  constructor(data: PlayerData) {
    super(data);
    this.skills = new Skills(data.skills);
    this.equipment = new Equipment(data.equipment);
    this.spellbook = new Spellbook(data.spellbook);
    this.friendlist = new Friendlist(data.friendlist);
    this.mounts = data.mounts;
    this.outfits = data.outfits;

    // Initialize character bars
    //this.characterElement.addManaBar((this.vitals.state.mana / this.vitals.state.maxMana) * 100 + "%");
    //this.characterElement.addEnergyBar((this.vitals.state.energy / this.vitals.state.maxEnergy) * 100 + "%");
  }

  static create(data: PlayerData): Player {
    const player = new Player(data);
    player.characterElementPixi = new CharacterPixiElement(player);
    player.characterElementPixi.enablePlayerBars();
    return player;
  }

  public getTile(): any {
    return window.gameClient.world.getTileFromWorldPosition(this.vitals.position);
  }

  public getMaxFloor(): number {
    return window.gameClient.world.getChunkFromWorldPosition(this.getPosition()).getFirstFloorFromBottom(this.getPosition());
  }

  public setCapacity(value: number): void {
    const capacityElement = document.getElementById("player-capacity");
    if (capacityElement) {
      capacityElement.innerHTML = `Cap: <br> ${Math.round(value / 100)}`;
    }
  }

  public setLevelSkillValue(which: string, value: number): void {
    (window.gameClient.interface.modalManager.get("skill-modal") as SkillModal).setSkillValue(which, value, value);
  }

  public setAmbientSound(): void {
    if (this.isUnderground()) {
      window.gameClient.interface.soundManager.setAmbientTrace("cave");
      window.gameClient.interface.soundManager.setVolume("rain", 0);
    } else {
      window.gameClient.interface.soundManager.setAmbientTrace("forest");
      // if (window.gameClient.renderer.weatherCanvas.isRaining()) {
      //   window.gameClient.interface.soundManager.setVolume("rain", 1);
      // }
    }
  }

  public isUnderground(): boolean {
    return this.getPosition().z < 8;
  }

  public setMovementBuffer(key: any): void {
    this.__movementBuffer = key;
  }

  public extendMovementBuffer(key: any): void {
    const LENIENCY = 0.75;
    if (this.getMovingFraction() < LENIENCY) {
      this.setMovementBuffer(key);
    }
  }

  public confirmClientWalk(): void {
    if (this.__serverWalkConfirmation) {
      window.gameClient.renderer.tileRenderer.refreshVisibleTiles()
    }
    this.__serverWalkConfirmation = true;
  }

  public isCreatureTarget(creature: any): boolean {
    return this.__target === creature;
  }

  public addExperience(experience: number): void {
    return;
  }

  public isInProtectionZone(): boolean {
    return this.getTile().isProtectionZone();
  }

  public setTarget(creature: any): void {
    this.__target = creature;
    (window.gameClient.interface.windowManager.getWindow("battle-window")! as BattleWindow).setTarget(creature);
  }

  public openContainer(container: any): void {
    this.__openedContainers.add(container);
  }

  public getItem(containerId: number, slotId: number): any {
    let container = this.getContainer(containerId);
    if (container === null) return null;
    return container.getSlotItem(slotId);
  }

  public getContainer(id: number): any {
    if (id === 0x00) return this.equipment;
    let containers = Array.from(this.__openedContainers);
    for (let i = 0; i < containers.length; i++) {
      if (containers[i].__containerId === id) {
        return containers[i];
      }
    }
    return null;
  }

  public closeAllContainers(): void {
    this.__openedContainers.forEach((container) => {
      this.removeContainer(container);
    });
  }

  public removeContainer(container: any): void {
    this.__openedContainers.delete(container);
    container.window.remove();
  }

  public closeContainer(container: any): void {
    window.gameClient.send(new ContainerClosePacket(container.____containerId));
  }
}

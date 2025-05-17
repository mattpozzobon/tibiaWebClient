import SkillModal from "../../modal-skills";
import Position from "../../position";
import State from "../../state";

export interface VitalsData {
  name: string;
  position: Position;
  direction: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  energy: number;
  maxEnergy: number;
  capacity: number;
  maxCapacity: number;
  speed: number;
  attackSlowness: number;
  speedValue?: number;
}

export class Vitals {
  public state: State;
  public name: string;
  public position: Position;
  public direction: number;
  public attackSlowness: number;
  public speedValue?: number;
  public maxCapacity: number;
  public speed: number;

  constructor(data: VitalsData) {
    this.state = new State();

    this.name = data.name;
    this.position = data.position;
    this.direction = data.direction;
    this.attackSlowness = data.attackSlowness;
    this.speedValue = data.speedValue;
    this.maxCapacity = data.maxCapacity;
    this.speed = data.speed;

    this.registerStatListener("health", "maxHealth", this.updateHealthBar);
    this.registerStatListener("mana", "maxMana", this.updateManaBar);
    this.registerStatListener("energy", "maxEnergy", this.updateEnergyBar);

    // Set values AFTER listeners
    this.state.health = data.health;
    this.state.maxHealth = data.maxHealth;
    this.state.mana = data.mana;
    this.state.maxMana = data.maxMana;
    this.state.energy = data.energy;
    this.state.maxEnergy = data.maxEnergy;
    this.state.capacity = data.capacity;

    this.setCharactherModal(data);
  }

  private setCharactherModal(data: VitalsData): void {
    (window.gameClient.interface.modalManager.get("skill-modal") as SkillModal)
      .setCharactherInfo(data);
  }

  private registerStatListener( statKey: "health" | "mana" | "energy",maxStatKey: "maxHealth" | "maxMana" | "maxEnergy", updateFn: () => void
  ): void {
    this.state.add(statKey, updateFn.bind(this));
    this.state.add(maxStatKey, updateFn.bind(this));
  }

  private updateHealthBar(): void {
    console.log('updateHealthBar', this.state.health, this.state.maxHealth);
    const player = window.gameClient.player;
    if (player && player.vitals.name === this.name) {
      const fraction = player.getHealthFraction();
      player.characterElement.setHealthFraction(fraction);
    }
  }

  private updateManaBar(): void {
    const player = window.gameClient.player;
    if (player && player.vitals.name === this.name) {
      const current = this.state.mana ?? 0;
      const max = this.state.maxMana ?? 1;
      player.characterElement.setDefaultMana(`${(current / max) * 100}%`);
    }
  }

  private updateEnergyBar(): void {
    const player = window.gameClient.player;
    if (player && player.vitals.name === this.name) {
      const current = this.state.energy ?? 0;
      const max = this.state.maxEnergy ?? 1;
      player.characterElement.setDefaultEnergy(`${(current / max) * 100}%`);
    }
  }
}

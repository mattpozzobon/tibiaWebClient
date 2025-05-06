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
    
    public health: number;
    public maxHealth: number;
    public mana: number;
    public maxMana: number;
    public energy: number;
    public maxEnergy: number;
    public capacity: number;
    public maxCapacity: number;
    public speed: number;

  constructor(data: VitalsData) {
    this.state = new State();

    this.name = data.name;
    this.position = data.position;
    this.direction = data.direction;
    this.attackSlowness = data.attackSlowness;
    this.speedValue = data.speedValue;
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    this.mana = data.mana;
    this.maxMana = data.maxMana;
    this.energy = data.energy;
    this.maxEnergy = data.maxEnergy;
    this.capacity = data.capacity;
    this.maxCapacity = data.maxCapacity;
    this.speed = data.speed;
    
    this.registerDefaultListeners();
    this.setCharactherModal(data);
  }

  private setCharactherModal(data: VitalsData): void {
    (window.gameClient.interface.modalManager.get("skill-modal") as SkillModal).setCharactherInfo(data);
  }

  private registerDefaultListeners(): void {
    this.state.add("health", this.setHealthStatus.bind(this));
    this.state.add("mana", this.setManaStatus.bind(this));
    this.state.add("maxMana", this.setManaStatus.bind(this));
    this.state.add("energy", this.setEnergyStatus.bind(this));
    this.state.add("maxEnergy", this.setEnergyStatus.bind(this));
    this.state.add("capacity", this.setCapacity.bind(this));
  }

  public setHealthStatus(): void {
    const current = this.state.health;
    const max = this.state.maxHealth;
    const fraction = (current / max) * 100 + "%";

    const bar = document.getElementById("health-bar");
    if (bar) {
      const firstChild = bar.firstElementChild as HTMLElement;
      if (firstChild) firstChild.style.width = fraction;

      const lastChild = bar.lastElementChild as HTMLElement;
      if (lastChild) lastChild.innerHTML = `${current} / ${max}`;
    }
  }

  private setManaStatus(): void {
    const current = this.state.mana;
    const max = this.state.maxMana;
    const fraction = (current / max) * 100 + "%";

    const manaBar = document.getElementById("mana-bar");
    if (manaBar) {
      const firstChild = manaBar.firstElementChild as HTMLElement | null;
      if (firstChild) firstChild.style.width = fraction;

      const lastChild = manaBar.lastElementChild as HTMLElement | null;
      if (lastChild) lastChild.innerHTML = `${current} / ${max}`;
    }
  }

  private setEnergyStatus(): void {
    const current = this.state.energy;
    const max = this.state.maxEnergy;
    const fraction = (current / max) * 100 + "%";

    const energyBar = document.getElementById("energy-bar");
    if (energyBar) {
      const firstChild = energyBar.firstElementChild as HTMLElement | null;
      if (firstChild) firstChild.style.width = fraction;

      const lastChild = energyBar.lastElementChild as HTMLElement | null;
      if (lastChild) lastChild.innerHTML = `${current} / ${max}`;
    }
  }

  private setCapacity(): void {
    const el = document.getElementById("player-capacity");
    if (el) {
      el.innerHTML = `Cap: <br> ${Math.round(this.state.capacity / 100)}`;
    }
  }
}

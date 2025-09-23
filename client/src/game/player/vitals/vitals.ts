// Vitals.ts
import State from "../../../core/state";
import Position from "../../position";

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

    // register reactive keys
    this.registerStatListener("health", "maxHealth");
    this.registerStatListener("mana", "maxMana");
    this.registerStatListener("energy", "maxEnergy");
    this.registerStatListener("capacity", "maxCapacity"); 

    // set values AFTER listeners are added
    this.state.health = data.health;
    this.state.maxHealth = data.maxHealth;
    this.state.mana = data.mana;
    this.state.maxMana = data.maxMana;
    this.state.energy = data.energy;
    this.state.maxEnergy = data.maxEnergy;

    this.state.capacity = data.capacity;       
    this.state.maxCapacity = data.maxCapacity;
  }

  private registerStatListener(
    statKey: "health" | "mana" | "energy" | "capacity",
    maxStatKey: "maxHealth" | "maxMana" | "maxEnergy" | "maxCapacity"
  ): void {
    this.state.add(statKey);
    this.state.add(maxStatKey);
  }
}

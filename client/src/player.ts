import ConditionManager from "./condition";
import Creature, { CreatureData } from "./creature";
import Equipment from "./equipment";
import Friendlist from "./friendlist";
import GameClient from "./gameclient";
import { ContainerClosePacket } from "./protocol";
import Skills from "./skills";
import Spellbook from "./spellbook";
import BattleWindow from "./window-battle";
import SkillWindow from "./window-skill";

interface PlayerData extends CreatureData {
  equipment: any;
  spellbook: any;
  friendlist: any;
  skills: any;
  mounts: any;
  outfits: any;
  maxCapacity: number;
  capacity: number;
  health: number;
  mana: number;
  maxMana: number;
  energy: number;
  maxEnergy: number;
  speed: number;
  // ... other properties as needed
}

export default class Player extends Creature {
  // Player-specific properties
  public equipment: Equipment;
  public spellbook: Spellbook;
  public friendlist: Friendlist;
  public skills: Skills;
  public mounts: any;
  public outfits: any;
  public state: State;

  // Private state for the player
  __movementEvent: any = null;
  __target: any = null;
  __movementBuffer: any = null;
  __openedContainers: Set<any> = new Set();
  __serverWalkConfirmation: boolean = true;

  constructor(data: PlayerData, gameClient: GameClient) {
    super(gameClient, data);
    
    
    this.state = new State();
    this.setState(data);

    // Players have equipment
    this.skills = new Skills(gameClient, data.skills);
    this.equipment = new Equipment(gameClient, data.equipment);
    this.spellbook = new Spellbook(gameClient, data.spellbook);

    // Container for the player's friend list
    this.friendlist = new Friendlist(gameClient, data.friendlist);

    // Initialize character bars
    this.characterElement.addManaBar((this.state.mana / this.state.maxMana) * 100 + "%");
    this.characterElement.addEnergyBar((this.state.energy / this.state.maxEnergy) * 100 + "%");
  }

  /**
   * Sets the player's state based on the provided data.
   */
  public setState(data: any): void {
    // Keep player state
    this.mounts = data.mounts;
    this.outfits = data.outfits;

    // Capacity
    this.state.add("capacity", this.setCapacity.bind(this));

    // Mana and energy
    this.state.add("mana", this.setManaStatus.bind(this));
    this.state.add("maxMana", this.setManaStatus.bind(this));
    this.state.add("energy", this.setEnergyStatus.bind(this));
    this.state.add("maxEnergy", this.setEnergyStatus.bind(this));

    // Other skills
    this.state.add("armor", this.setLevelSkillValue.bind(this, "armor"));
    this.state.add("attack", this.setLevelSkillValue.bind(this, "attack"));
    this.state.add("speed", this.setLevelSkillValue.bind(this, "speed"));

    // Set defaults
    this.state.maxCapacity = data.maxCapacity;
    this.state.capacity = data.capacity;
    this.state.health = data.health;
    this.state.mana = data.mana;
    this.state.maxMana = data.maxMana;
    this.state.energy = data.energy;
    this.state.maxEnergy = data.maxEnergy;
    this.state.speed = data.speed;
    this.state.armor = 90;
    this.state.attack = 0;
  }

   /**
   * Updates the health status in the DOM.
   */
  public setHealthStatus(): void {
    const currentHealth = this.state.health;
    const maxHealth = this.maxHealth;
    const healthBar = document.getElementById("health-bar");
    if (healthBar) {
      const firstChild = healthBar.firstElementChild as HTMLElement | null;
      if (firstChild) {
        firstChild.style.width = `${(currentHealth / maxHealth) * 100}%`;
      }
      const lastChild = healthBar.lastElementChild as HTMLElement | null;
      if (lastChild) {
        lastChild.innerHTML = `${currentHealth} / ${maxHealth}`;
      }
    }
    this.characterElement.setDefault();
  }


  /**
   * Updates the mana status in the DOM.
   */
  public setManaStatus(): void {
    const currentMana = this.state.mana;
    const maxMana = this.state.maxMana;
    const fraction = (currentMana / maxMana) * 100 + "%";
  
    // Above character bars
    this.characterElement.setDefaultMana(fraction);
  
    // Panel bars
    const manaBar = document.getElementById("mana-bar");
    if (manaBar) {
      const firstChild = manaBar.firstElementChild as HTMLElement | null;
      if (firstChild) {
        firstChild.style.width = fraction;
      }
      const lastChild = manaBar.lastElementChild as HTMLElement | null;
      if (lastChild) {
        lastChild.innerHTML = `${currentMana} / ${maxMana}`;
      }
    }
  }
  

  /**
   * Updates the energy status in the DOM.
   */
  public setEnergyStatus(): void {
    const currentEnergy = this.state.energy;
    const maxEnergy = this.state.maxEnergy;
    const fraction = (currentEnergy / maxEnergy) * 100 + "%";
  
    // Above character bars
    this.characterElement.setDefaultEnergy(fraction);
  
    // Panel bars
    const energyBar = document.getElementById("energy-bar");
    if (energyBar) {
      const firstChild = energyBar.firstElementChild as HTMLElement | null;
      if (firstChild) {
        firstChild.style.width = fraction;
      }
      const lastChild = energyBar.lastElementChild as HTMLElement | null;
      if (lastChild) {
        lastChild.innerHTML = `${currentEnergy} / ${maxEnergy}`;
      }
    }
  }
  
  /**
   * Calculates the player's speed, considering conditions like haste.
   */
  public getSpeed(): number {
    let base = this.state.speed;

    if (this.hasCondition(ConditionManager.HASTE)) {
      base *= 1.3;
    }

    return base;
  }

  /**
   * Calculates the step duration based on the player's speed and tile friction.
   */
  public getStepDuration(tile: any): number {
    const A = 857.36;
    const B = 261.29;
    const C = -4795.009;

    let calculatedStepSpeed = Math.max(1, Math.round(A * Math.log(this.getSpeed() + B) + C));

    // Friction of the tile
    let groundSpeed = tile.getFriction();

    return Math.ceil(Math.floor(1000 * groundSpeed / calculatedStepSpeed) / this.gameClient.getTickInterval());
  }

  /**
   * Returns the tile the player is currently on.
   */
  public getTile(): any {
    return this.gameClient.world.getTileFromWorldPosition(this.__position);
  }

  /**
   * Returns the maximum visible floor for the player.
   */
  public getMaxFloor(): number {
    return this.gameClient.world.getChunkFromWorldPosition(this.getPosition()).getFirstFloorFromBottom(this.getPosition());
  }

  /**
   * Updates the player's capacity in the DOM.
   */
  public setCapacity(value: number): void {
    const capacityElement = document.getElementById("player-capacity");
    if (capacityElement) {
      capacityElement.innerHTML = `Cap: <br> ${Math.round(value / 100)}`;
    }
  }

  /**
   * Updates a skill value in the skill window.
   */
  public setLevelSkillValue(which: string, value: number): void {
    // TODO: check the percerntage value
    (this.gameClient.interface.windowManager.getWindow("skill-window")! as SkillWindow).setSkillValue(which, value, value);
  }

  /**
   * Sets the ambient sound based on the player's location.
   */
  public setAmbientSound(): void {
    if (this.isUnderground()) {
      this.gameClient.interface.soundManager.setAmbientTrace("cave");
      this.gameClient.interface.soundManager.setVolume("rain", 0);
    } else {
      this.gameClient.interface.soundManager.setAmbientTrace("forest");

      if (this.gameClient.renderer.weatherCanvas.isRaining()) {
        this.gameClient.interface.soundManager.setVolume("rain", 1);
      }
    }
  }

  /**
   * Checks if the player is underground.
   */
  public isUnderground(): boolean {
    return this.getPosition().z < 8;
  }

  /**
   * Sets the movement buffer for the player.
   */
  public setMovementBuffer(key: any): void {
    this.__movementBuffer = key;
  }

  /**
   * Extends the movement buffer if the player is not too far into their current movement.
   */
  public extendMovementBuffer(key: any): void {
    const LENIENCY = 0.75;

    if (this.getMovingFraction() < LENIENCY) {
      this.setMovementBuffer(key);
    }
  }

  /**
   * Confirms the client-side walk-ahead.
   */
  public confirmClientWalk(): void {
    if (this.__serverWalkConfirmation) {
      this.gameClient.renderer.updateTileCache();
    }

    this.__serverWalkConfirmation = true;
  }

  /**
   * Checks if a creature is the current target.
   */
  public isCreatureTarget(creature: any): boolean {
    return this.__target === creature;
  }

  /**
   * Adds experience points to the player.
   */
  public addExperience(experience: number): void {
    // Placeholder for experience logic
    return;
  }

  /**
   * Checks if the player is in a protection zone.
   */
  public isInProtectionZone(): boolean {
    return this.getTile().isProtectionZone();
  }

  /**
   * Sets the player's target.
   */
  public setTarget(creature: any): void {
    this.__target = creature;
    (this.gameClient.interface.windowManager.getWindow("battle-window")! as BattleWindow).setTarget(creature);
  }

  /**
   * Opens a container.
   */
  public openContainer(container: any): void {
    this.__openedContainers.add(container);
  }

  /**
   * Returns an item from a container and slot index.
   */
  public getItem(containerId: number, slotId: number): any {
    let container = this.getContainer(containerId);

    if (container === null) {
      return null;
    }

    return container.getSlotItem(slotId);
  }

  /**
   * Returns a container based on its identifier.
   */
  public getContainer(id: number): any {
    if (id === 0x00) {
      return this.equipment;
    }

    let containers = Array.from(this.__openedContainers);

    for (let i = 0; i < containers.length; i++) {
      if (containers[i].__containerId === id) {
        return containers[i];
      }
    }

    return null;
  }

  /**
   * Closes all containers.
   */
  public closeAllContainers(): void {
    this.__openedContainers.forEach((container) => {
      this.removeContainer(container);
    });
  }

  /**
   * Removes a container from the DOM.
   */
  public removeContainer(container: any): void {
    this.__openedContainers.delete(container);
    container.window.remove();
  }

  /**
   * Closes a container and removes it from the GUI.
   */
  public closeContainer(container: any): void {
    this.gameClient.send(new ContainerClosePacket(container.____containerId));
  }
}
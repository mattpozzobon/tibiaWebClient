import Creature from "../../game/creature";
import Interface from "../interface";
import ScreenElement from "./screen-element";


export default class CharacterElement extends ScreenElement {
  private __creature: Creature;
  public manaBar?: HTMLElement;
  public energyBar?: HTMLElement;

  constructor(creature: Creature) {
    super("character-element-prototype");
    
    this.__creature = creature;
    this.setName(creature.vitals.name);
  }

  public setDefault(): void {
    this.setHealthFraction(this.__creature.getHealthFraction());
  }

  public setDefaultEnergy(value: string): void {
    if (this.energyBar) {
      const energyBar = this.element.querySelector(".value-energy") as HTMLElement;
      if (energyBar) {
        energyBar.style.width = value;
      }
    }
  }

  public setDefaultMana(value: string): void {
    if (this.manaBar) {
      const manaBar = this.element.querySelector(".value-mana") as HTMLElement;
      if (manaBar) {
        manaBar.style.width = value;
      }
    }
  }

  public setGrey(): void {
    this.setHealthColor(Interface.COLORS.LIGHTGREY);
    this.setManaColor(Interface.COLORS.LIGHTGREY);
  }

  public setHealthFraction(fraction: number): void {
    const color =
      fraction > 0.50 ? Interface.COLORS.LIGHTGREEN :
      fraction > 0.25 ? Interface.COLORS.ORANGE :
      fraction > 0.10 ? Interface.COLORS.RED :
                        Interface.COLORS.DARKRED;
    const healthBar = this.element.querySelector(".value-health") as HTMLElement;
    if (healthBar) {
      // Assuming fraction is a value between 0 and 1.
      healthBar.style.width = (fraction * 100).toString() + "%";
    }
    this.setHealthColor(color);
  }

  public setHealthColor(color: any): void {
    const healthBar = this.element.querySelector(".value-health") as HTMLElement;
    if (healthBar) {
      healthBar.style.backgroundColor = Interface.prototype.getHexColor(color);
    }
    this.setNameColor(color);
  }

  public setManaColor(color: any): void {
    const manaBar = this.element.querySelector(".value-mana") as HTMLElement;
    if (manaBar) {
      manaBar.style.backgroundColor = Interface.prototype.getHexColor(color);
    }
  }

  public setNameColor(color: any): void {
    const nameSpan = this.element.querySelector("span") as HTMLElement;
    if (nameSpan) {
      nameSpan.style.color = Interface.prototype.getHexColor(color);
    }
  }

  public setName(name: string): void {
    const nameSpan = this.element.querySelector("span") as HTMLElement;
    if (nameSpan) {
      nameSpan.innerHTML = name;
    }
  }

  public setTextPosition(): void {
    const creatureTilePos = window.gameClient.renderer.getCreatureScreenPosition(this.__creature);
  
    const canvas = window.gameClient.renderer.screen.canvas;
    const rect = canvas.getBoundingClientRect();
  
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
  
    const spriteSizeX = Interface.TILE_SIZE * scaleX;
    const spriteSizeY = Interface.TILE_SIZE * scaleY;
  
    const screenCenterX = (Interface.TILE_WIDTH - 1) / 2;
    const screenCenterY = (Interface.TILE_HEIGHT - 1) / 2;
  
    // 🧠 now correct offset using independent X and Y scaling:
    const offsetX = (creatureTilePos.x - screenCenterX) * spriteSizeX + rect.left + rect.width / 2;
    const offsetY = (creatureTilePos.y - screenCenterY) * spriteSizeY + rect.top + rect.height / 2;
  
    this.element.style.transform = `translate(
      ${offsetX - this.element.offsetWidth / 2 - 20}px,
      ${offsetY - spriteSizeY * 1.2}px
    )`;
  }

  public addManaBar(value: string): void {
    if (!this.manaBar) {
      this.manaBar = this.addBar("mana");
    }
    this.setDefaultMana(value);
  }

  public addEnergyBar(value: string): void {
    if (!this.energyBar) {
      this.energyBar = this.addBar("energy");
    }
    this.setDefaultEnergy(value);
  }

}

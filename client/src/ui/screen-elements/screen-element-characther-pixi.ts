import { Container, Graphics, BitmapText, TextOptions } from "pixi.js";
import Creature from "../../game/creature";
import Position from "../../game/position";

export enum BarType {
  Health = 0,
  Mana = 1,
  Energy = 2,
}

export enum COLOR {
  BLACK      = 0x000000,
  BLUE       = 0x0030FF,
  LIGHTGREEN = 0x50F050,
  ORANGE     = 0xFF9F00,
  RED        = 0xD60000,
  DARKRED    = 0x6A0000,
  YELLOW     = 0xFFFF00,
  WHITE      = 0xFFFFFF,
}

export default class CharacterPixiElement extends Container {
  private __creature: Creature;
  private readonly BAR_WIDTH = 18;
  private readonly BAR_HEIGHT = 2;
  private readonly BAR_SPACING = 0;
  private nameText!: BitmapText;
  private bars: Record<BarType, { fill: Graphics }> = {} as any;

  constructor(creature: Creature) {
    super();
    this.__creature = creature;
    this.createNameText();
    this.createBar(BarType.Health, this.getHealthColor(this.__creature.getHealthFraction()));
    this.createBar(BarType.Mana, COLOR.BLUE);
    this.createBar(BarType.Energy, COLOR.YELLOW);

    window.gameClient.renderer.overlayLayer.addChild(this);
  }

  private createNameText(): void {
    const fraction = this.__creature.getHealthFraction();
    const nameColor = this.getHealthColor(fraction);
    this.nameText = new BitmapText({
      text: this.__creature.getName(),
      style: {
        fontFamily: "Tibia-Border-16px-Subtle",
        fontSize: 10,
      }
    } as TextOptions);

    this.nameText.tint = nameColor;
    this.nameText.anchor.set(0.5, 1);
    this.nameText.position.set(this.BAR_WIDTH / 2, -2); // Centered above bars
    this.addChild(this.nameText);
  }

  private createBar(barType: BarType, fillColor: number): void {
    const scale = window.gameClient.renderer.scalingContainer.scale.y;
    const y = barType * (this.BAR_HEIGHT);

    const bar = new Container();
    const border = new Graphics();
    const fill = new Graphics();

    border.rect(0, 0, this.BAR_WIDTH, (this.BAR_HEIGHT/scale)*1.5).fill(0x000000);

    bar.addChild(border);
    border.addChild(fill);

    bar.position.set(0, y);
    this.addChild(bar);
    this.bars[barType] = { fill };
  }
  
  
  public render(): void {
    const screenPos: Position = window.gameClient.renderer.getCreatureScreenPosition(this.__creature);
    this.position.set(screenPos.x * 32 + 4, screenPos.y * 32 - 16);
    this.visible = true;

    // Health
    const healthFraction = this.__creature.getHealthFraction?.() ?? 1;
    const healthColor = this.getHealthColor(healthFraction);
    this.updateBar(BarType.Health, healthFraction, healthColor);
    this.nameText.tint = healthColor;

    // Mana
    const manaFraction = this.__creature.getManaFraction?.() ?? 1;
    this.updateBar(BarType.Mana, manaFraction, COLOR.BLUE);

    // Energy
    const energyFraction = this.__creature.getEnergyFraction?.() ?? 1;
    this.updateBar(BarType.Energy, energyFraction, COLOR.YELLOW);
  }

  private updateBar(barType: BarType, fraction: number, color: number): void {
      const bar = this.bars[barType];
      const fill = bar.fill;
      const scale = window.gameClient.renderer.scalingContainer.scale.y;

      fill.clear();

      const fillWidth = Math.max(1, Math.round((this.BAR_WIDTH - 2) * Math.max(0, Math.min(fraction, 1))));

      fill.rect(0.2, 0.2, fillWidth+1, this.BAR_HEIGHT/scale).fill(color);
  }

  public remove(): void {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  private getHealthColor(fraction: number): number {
    return fraction > 0.50 ? COLOR.LIGHTGREEN
         : fraction > 0.25 ? COLOR.ORANGE
         : fraction > 0.10 ? COLOR.RED
         : COLOR.DARKRED;
  }
}

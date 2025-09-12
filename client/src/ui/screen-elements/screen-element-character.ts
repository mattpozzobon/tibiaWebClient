// src/ui/character-pixi-element.ts
import { Container, Sprite, BitmapText, TextOptions, Texture, BlurFilter } from "pixi.js";
import Creature from "../../game/creature";
import Interface from "../interface";
import { PositionHelper } from "../../renderer/position-helper";

export enum BarType { Health = 0, Mana = 1, Energy = 2 }
export enum COLOR {
  BLACK=0x000000, BLUE=0x0030FF, LIGHTGREEN=0x50F050, ORANGE=0xFF9F00,
  RED=0xD60000, DARKRED=0x6A0000, YELLOW=0xFFFF00, WHITE=0xFFFFFF
}

type BarSprites = { bg: Sprite; fill: Sprite; glow?: Sprite; height: number };

export default class CharacterElement extends Container {
  private __creature: Creature;
  private readonly BAR_WIDTH  = 48;
  private readonly BAR_HEIGHT = 4;
  private readonly FONT_SIZE  = 24;

  private barCount = 1;
  private nameText!: BitmapText;
  private bars: Record<BarType, BarSprites> = {} as any;

  constructor(creature: Creature) {
    super();
    this.__creature = creature;
    this.createNameText();
    this.createBar(BarType.Health);
  }

  public enablePlayerBars() {
    this.barCount = 3;
    this.createBar(BarType.Mana);
    this.createBar(BarType.Energy);
    this.createBar(BarType.Health);
  }

  private createNameText(): void {
    const fraction = this.__creature.getHealthFraction();
    const nameColor = this.getHealthColor(fraction);
    this.nameText = new BitmapText({
      text: this.__creature.getName(),
      style: { fontFamily: "Tibia-Border-16px-Subtle", fontSize: this.FONT_SIZE }
    } as TextOptions);
    this.nameText.tint = nameColor;
    this.nameText.anchor.set(0.5, 1);
    this.nameText.position.set(this.BAR_WIDTH / 2, -this.BAR_HEIGHT);
    (this.nameText as any).roundPixels = true;
    this.addChild(this.nameText);
  }

  private getBarYPosition(barType: BarType): number {
    const h = this.barHeight(barType);
    let y = 0;
    if (barType === BarType.Mana) y = this.barHeight(BarType.Health) - 1;
    if (barType === BarType.Energy) y = this.barHeight(BarType.Health) + this.barHeight(BarType.Mana) - 2;
    return y;
  }

  private barHeight(barType: BarType): number {
    return barType === BarType.Health ? Math.round(this.BAR_HEIGHT * 1.5) : this.BAR_HEIGHT;
  }

  private createBar(barType: BarType): void {
    const unit = Texture.WHITE;
    const height = this.barHeight(barType);

    const bg = new Sprite(unit);
    bg.tint = COLOR.BLACK;
    bg.width = this.BAR_WIDTH;
    bg.height = height;
    (bg as any).roundPixels = true;

    const fill = new Sprite(unit);
    fill.x = 0.5;
    fill.y = 1;
    fill.height = Math.max(1, height - 2);
    (fill as any).roundPixels = true;

    let glow: Sprite | undefined;
    if (barType === BarType.Health) {
      glow = new Sprite(unit);
      glow.x = 1;
      glow.y = 1 + Math.floor((fill.height * 0.5) * -0.15);
      glow.height = Math.ceil(fill.height * 1.3);
      glow.alpha = 0.85;
      glow.blendMode = "add" as any;
      (glow as any).roundPixels = true;
    }

    const bar = new Container();
    bar.addChild(bg);
    if (glow) bar.addChild(glow);
    bar.addChild(fill);
    bar.position.set(0, this.getBarYPosition(barType));
    this.addChild(bar);

    this.bars[barType] = { bg, fill, glow, height };
  }

  private getBarYOffset(): number {
    return this.barHeight(BarType.Health) + (this.barCount > 1 ? this.barHeight(BarType.Mana) : 0) + (this.barCount > 2 ? this.barHeight(BarType.Energy) : 0);
  }

  public render(): void {
    const { x, y, worldScale, snap } = PositionHelper.getOverlayCreatureScaled(this.__creature);
  
    // bars render in world space → inverse scale to keep them crisp
    this.scale.set(1 / worldScale);
    const aboveHead = Interface.TILE_SIZE + this.getBarYOffset() - (Interface.TILE_SIZE - 3);
  
    this.position.set(snap(x - this.BAR_WIDTH / 2), snap(y - aboveHead));
  
    this.visible = true;
  
    const healthFraction = this.__creature.getHealthFraction?.() ?? 1;
    const healthColor    = this.getHealthColor(healthFraction);
    this.updateBar(BarType.Health, healthFraction, healthColor, worldScale);
    this.nameText.tint = healthColor;
  
    if (this.bars[BarType.Mana]) {
      const manaFraction = this.__creature.getManaFraction?.() ?? 1;
      this.updateBar(BarType.Mana, manaFraction, COLOR.BLUE, worldScale);
    }
    if (this.bars[BarType.Energy]) {
      const energyFraction = this.__creature.getEnergyFraction?.() ?? 1;
      this.updateBar(BarType.Energy, energyFraction, COLOR.YELLOW, worldScale);
    }
  }

  private updateBar(barType: BarType, fraction: number, color: number, worldScale: number): void {
    const { fill, bg, glow, height } = this.bars[barType];
    const clamped = Math.max(0, Math.min(fraction, 1));
    const innerW = this.BAR_WIDTH - 2;
    const w = Math.max(0, Math.round(innerW * clamped));

    fill.tint = color;
    fill.width = w;

    if (glow) {
      glow.tint = color;
      glow.width = Math.max(0, Math.round(w * 1.02));
      const blur = new BlurFilter({ strength: 2.2 * worldScale, quality: 2 });
      glow.filters = [blur];
    }

    (bg as any).roundPixels = true;
    (fill as any).roundPixels = true;
    if (glow) (glow as any).roundPixels = true;
  }

  public remove(): void {
    if (this.parent) this.parent.removeChild(this);
  }

  attachTo(layer: Container) {
    if (this.parent !== layer) layer.addChild(this);
  }

  destroy(options?: any) {
    if (this.parent) this.parent.removeChild(this);
    super.destroy?.(options);
  }

  private getHealthColor(fraction: number): number {
    return fraction > 0.50 ? COLOR.LIGHTGREEN
         : fraction > 0.25 ? COLOR.ORANGE
         : fraction > 0.10 ? COLOR.RED
         : COLOR.DARKRED;
  }
}

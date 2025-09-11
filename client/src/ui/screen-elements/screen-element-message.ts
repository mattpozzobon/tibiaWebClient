// src/ui/screen-elements/message-element.ts
import { Container, BitmapText, TextOptions } from "pixi.js";
import Creature from "../../game/creature";
import Position from "../../game/position";
import Interface from "../interface";

export default class MessageElement {
  public container: Container;
  public __entity: Creature;
  public __color: number;

  private __position: Position; // anchor (spawn)
  private __message: string;
  private nameText: BitmapText;
  private bodyText: BitmapText;
  private stackOffsetPx = 0;

  constructor(entity: Creature, message: string, color: number) {
    this.container = new Container();
    this.container.sortableChildren = true;

    this.__entity   = entity;
    this.__position = entity.getPosition().copy();
    this.__message  = message;
    this.__color    = color;

    this.nameText = new BitmapText({text: entity.getName(), style: { fontFamily: "Tibia-Border-16px-Subtle", fontSize: 20 }} as TextOptions);
    this.bodyText = new BitmapText({text: message,          style: { fontFamily: "Tibia-Border-16px-Subtle", fontSize: 20 }} as TextOptions);

    this.nameText.anchor.set(0.5, 1);
    this.bodyText.anchor.set(0.5, 0);
    this.nameText.position.set(0, 0);
    this.bodyText.position.set(0, 2);
    this.nameText.tint = color;
    this.bodyText.tint = color;
    (this.nameText as any).roundPixels = true;
    (this.bodyText as any).roundPixels = true;

    this.container.addChild(this.nameText, this.bodyText);
  }

  public setStackOffset(px: number): void {
    this.stackOffsetPx = px;
  }

  public getDuration(): number {
    const n = this.__message.length || 1;
    return Math.max(2500, Math.min(2500 + 60 * n, 8000));
  }

  public setMessage(message: string): void {
    this.__message = message;
    this.nameText.text = this.__entity.getName();
    this.bodyText.text = message;
  }

  public setColor(color: number): void {
    this.__color = color;
    this.nameText.tint = color;
    this.bodyText.tint = color;
  }

  // world-space placement (overlayLayer), anchored at spawn tile
  public setTextPosition(): void {
    const t = window.gameClient.renderer.getStaticScreenPosition(this.__position);

    const ts    = Interface.TILE_SIZE;
    const sc    = window.gameClient.renderer.scalingContainer;
    const scale = sc.scale.x || 1;

    let x = (t.x * ts + ts * 0.5) * scale + sc.x;
    let y = (t.y * ts) * scale + sc.y;

    // raise above head; apply per-message stack (both in screen px)
    const headGapPx = (ts - 6) * scale;
    y -= headGapPx + this.stackOffsetPx;

    // crisp text
    this.container.scale.set(1);
    this.container.position.set(Math.round(x), Math.round(y));
  }

  public remove(): void {
    if (this.container.parent) this.container.parent.removeChild(this.container);
  }
}

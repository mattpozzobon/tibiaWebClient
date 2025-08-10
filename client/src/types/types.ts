import { Texture } from "pixi.js";

export interface BatchSprite {
    sprite: { texture: Texture };
    x: number; y: number;
    width: number; height: number;
    outline?: boolean;
  }
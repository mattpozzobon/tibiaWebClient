import { BLEND_MODES, Texture } from "pixi.js";

export type BatchSprite = {
  sprite: { texture: Texture };
  x: number;
  y: number;
  width: number;
  height: number;
  outline?: boolean;

  tint?: number;               // e.g. 0xA0A0A0
  alpha?: number;              // e.g. 0.8
  blendMode?: BLEND_MODES; // if you need multiply etc later
};

export type BatchSpriteStyle = {
  tint?: number;
  alpha?: number;
  blendMode?: BLEND_MODES
};


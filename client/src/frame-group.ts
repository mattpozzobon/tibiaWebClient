import GameClient from "./gameclient";
import Position from "./position";
import Sprite from "./sprite";

export default class FrameGroup {
    ;

    type: number = 0;
    asynchronous: number = 0;
    nLoop: number = 0;
    start: number = 0;


    width: number = 0;
    height: number = 0;
    layers: number = 1;
    pattern: Position = new Position(0, 0, 0);
    animationLength: number = 1;
    private __totalAnimationLength: number = 0;
    sprites: number[] = [];
    animationLengths: { min: number; max: number }[] = [];
  
    static NONE: number = 0;
    static GROUP_IDLE: number = 0;
    static GROUP_MOVING: number = 1;

    constructor() {
      
    }
  
    getAlwaysAnimatedFrame(): number {
      if (!this.isAnimated()) {
        return 0;
      }
  
      let current = window.gameClient.renderer.__nMiliseconds % this.__totalAnimationLength;
      let sum = 0;
  
      for (let i = 0; i < this.animationLengths.length; i++) {
        sum += this.animationLengths[i].min;
        if (sum >= current) {
          return i;
        }
      }
  
      return 0;
    }
  
    isValidIndex(index: number): boolean {
      return index >= 0 && index < this.sprites.length;
    }
  
    getSprite(index: number): Sprite | null {
      if (!this.isValidIndex(index)) {
        return null;
      }
      return window.gameClient.spriteBuffer.get(this.sprites[index]);
    }
  
    isAnimated(): boolean {
      return this.animationLength > 1;
    }
  
    setAnimation(animations: { min: number; max: number }[]): void {
      this.animationLengths = animations;
      this.__totalAnimationLength = animations.reduce((a, b) => a + b.min, 0);
    }
  
    setAnimationLength(length: number): void {
      this.animationLength = length;
    }
  
    getSpriteId(frame: number, xPattern: number, yPattern: number, zPattern: number, layer: number, x: number, y: number): number {
      let index = this.getSpriteIndex(frame, xPattern, yPattern, zPattern, layer, x, y);
      return this.isValidIndex(index) ? this.sprites[index] : 0;
    }
  
    getSpriteIndex(frame: number, xPattern: number, yPattern: number, zPattern: number, layer: number, x: number, y: number): number {
      return ((((((frame * this.pattern.z + zPattern) * this.pattern.y + yPattern) *
        this.pattern.x + xPattern) * this.layers + layer) *
        this.height + y) *
        this.width + x);
    }
  
    setLayers(layers: number): void {
      this.layers = layers;
    }
  
    setPattern(x: number, y: number, z: number): void {
      this.pattern = new Position(x, y, z);
    }
  
    setSize(width: number, height: number): void {
      this.width = width;
      this.height = height;
    }
  
    getNumberSprites(): number {
      return this.width * this.height * this.layers * this.pattern.x * this.pattern.y * this.pattern.z * this.animationLength;
    }
  }
  
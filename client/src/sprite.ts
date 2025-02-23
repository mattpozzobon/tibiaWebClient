import Position from "./position";

export default class Sprite {
  src: HTMLCanvasElement;
  position: Position;
  size: number;

  constructor(src: HTMLCanvasElement, position: Position, size: number) {
    /*
     * Class Sprite
     * Container for a single sprite that references a spritesheet, position, and size
     */

    this.src = src;
    this.position = position;
    this.size = size;
  }
}

import Position from "../game/position";
import Canvas from "./canvas";


export default class OutlineCanvas extends Canvas {
  private __currentIdentifier: number = 0;
  
  
  constructor(id: string | null, width: number, height: number) {
    super( id, width, height);
    
    this.context.fillStyle = "white";
  }

  createOutline(spriteIdentifier: number): void {
    if (spriteIdentifier === 0 || spriteIdentifier === this.__currentIdentifier) {
      return;
    }

    this.__currentIdentifier = spriteIdentifier;
    this.context.globalCompositeOperation = "source-over";
    this.clear();

    const position = window.gameClient.spriteBuffer.getSpritePosition(spriteIdentifier);

    this.context.filter = "blur(2px)";
    this.drawOutlineSprite(position!);
    this.context.filter = "none";

    this.context.globalCompositeOperation = "source-in";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.globalCompositeOperation = "destination-out";
    this.drawOutlineSprite(position!);
  }

  drawOutlineSprite(position: Position): void {
    this.context.drawImage(
      window.gameClient.spriteBuffer.__spriteBufferCanvas.canvas,
      position.x * 32,
      position.y * 32,
      32, 32,
      1, 1,
      32, 32
    );
  }
}

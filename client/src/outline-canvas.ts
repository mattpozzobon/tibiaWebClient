import Canvas from "./canvas";
import GameClient from "./gameclient";
import Position from "./position";

export default class OutlineCanvas extends Canvas {
  private __currentIdentifier: number = 0;
  gameCLient: GameClient
  
  constructor(gameCLient: GameClient, id: string | null, width: number, height: number) {
    super(gameCLient, id, width, height);
    this.gameCLient = gameCLient;
    this.context.fillStyle = "white";
  }

  createOutline(spriteIdentifier: number): void {
    if (spriteIdentifier === 0 || spriteIdentifier === this.__currentIdentifier) {
      return;
    }

    this.__currentIdentifier = spriteIdentifier;
    this.context.globalCompositeOperation = "source-over";
    this.clear();

    const position = this.gameClient.spriteBuffer.getSpritePosition(spriteIdentifier);

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
      this.gameClient.spriteBuffer.__spriteBufferCanvas.canvas,
      position.x * 32,
      position.y * 32,
      32, 32,
      1, 1,
      32, 32
    );
  }
}

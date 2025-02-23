import Canvas from "./canvas";
import GameClient from "./gameclient";
import Position from "./position";

export default class WeatherCanvas {
  gameClient: GameClient;
  public screen: Canvas;
  public cloudPattern: HTMLImageElement;

  private __ambientAlpha: number;
  private __ambientAlphaTarget: number;
  private __ambientAlphaStart: number;

  private __steps: number;
  private __counter: number;

  private __flash: number;
  private __isRaining: boolean;
  private __rainIntensity: number;
  private __thunderIntensity: number;

  constructor(gameClient: GameClient, screen: Canvas) {
    // Wrapper for the screen canvas: we do not need an extra canvas
    this.screen = screen;
    this.gameClient = gameClient;
    // Fading state
    this.__ambientAlpha = 0;
    this.__ambientAlphaTarget = 0;
    this.__ambientAlphaStart = 0;

    this.__steps = 0;
    this.__counter = 0;

    this.__flash = 0;
    this.__isRaining = false;
    this.__rainIntensity = 0.025;
    this.__thunderIntensity = 0.0025;

    const img = new Image();
    img.src = "./png/cloud.png";
    this.cloudPattern = img;
  }

  public setThunder(): void {
    // Schedules a thunder effect.
    this.__flash = 5;
  }

  public setWeather(alpha: number): void {
    // Sets up the weather to be shown through a fade.
    this.__ambientAlphaStart = this.__ambientAlpha;
    this.__ambientAlphaTarget = alpha;

    this.__steps = (500 * Math.abs(this.__ambientAlpha - alpha)) | 0;
    this.__counter = this.__steps;
  }

  public isRaining(): boolean {
    return this.__isRaining;
  }

  public setRaining(bool: boolean): void {
    this.__isRaining = bool;

    if (this.__isRaining && !this.gameClient.player!.isUnderground()) {
      this.gameClient.interface.soundManager.setVolume("rain", 1);
    } else {
      this.gameClient.interface.soundManager.setVolume("rain", 0);
    }
  }

  public drawThunder(): void {
    // Draws a thunder flash to the screen.
    if (this.__flash > 0) {
      this.screen.context.globalAlpha = this.__flash / 10;
      this.screen.context.fillStyle = "white";
      this.screen.context.fillRect(0, 0, this.screen.canvas.width, this.screen.canvas.height);
      this.__flash--;

      // Extend flashes
      if (Math.random() < 0.40) {
        this.setThunder();
      }
    }
  }

  public handleThunder(): void {
    if (Math.random() < this.__thunderIntensity && this.isRaining() && this.__flash === 0) {
      this.gameClient.interface.soundManager.play("thunder");
      this.setThunder();
    }
    this.drawThunder();
  }

  public drawWeather(): void {
    // Draws the weather (e.g., clouds) to the gamescreen canvas.

    // Hardcoded to clouds.
    const pattern = this.cloudPattern;

    // Underground has no weather.
    if (!this.gameClient.player!.isUnderground()) {
      this.handleThunder();
    }

    if (this.__counter > 0) {
      this.__ambientAlpha =
        this.__ambientAlphaTarget +
        ((this.__counter - 1) / this.__steps) * (this.__ambientAlphaStart - this.__ambientAlphaTarget);
      this.__counter--;
    }

    // No ambient means no weather.
    if (this.__ambientAlpha === 0) {
      return;
    }

    this.screen.context.globalAlpha = this.__ambientAlpha;

    // Assuming "off" is a global variable of type Position.
    // todo: CHECK THIS "off"
    const off = this.gameClient.player!.getMoveOffset();

    const selfx = 0.15 * this.gameClient.renderer.debugger.__nFrames + 256 * Math.cos(0.002 * this.gameClient.renderer.debugger.__nFrames);
    const selfy = 0.15 * this.gameClient.renderer.debugger.__nFrames + 256 * Math.sin(0.002 * this.gameClient.renderer.debugger.__nFrames);

    // Add self movement of the texture to the static world position.
    const x = ((32 * (this.gameClient.player!.getPosition().x - off.x)) | 0) + selfx;
    const y = ((32 * (this.gameClient.player!.getPosition().y - off.y)) | 0) + selfy;
    this.drawPattern(pattern, x, y);

    const selfx2 = -0.15 * this.gameClient.renderer.debugger.__nFrames + 256;
    const selfy2 = -0.15 * this.gameClient.renderer.debugger.__nFrames + 256;

    const x2 = ((32 * (this.gameClient.player!.getPosition().x - off.x)) | 0) + selfx2;
    const y2 = ((32 * (this.gameClient.player!.getPosition().y - off.y)) | 0) + selfy2;
    this.drawPattern(pattern, x2, y2);

    // Reset global alpha.
    this.screen.context.globalAlpha = 1;
  }

  public drawPattern(pattern: HTMLImageElement, x: number, y: number): void {
    // Draws a tileable pattern to the screen. (x, y) are arbitrary.
    // Clamp x and y.
    x = Math.max(0, x) % this.screen.canvas.width;
    y = Math.max(0, y) % this.screen.canvas.height;
    x = Math.round(x);
    y = Math.round(y);

    // Draw the image four times to cover the canvas.
    // Top left corner.
    this.screen.context.drawImage(
      pattern,
      x,
      y,
      this.screen.canvas.width - x,
      this.screen.canvas.height - y,
      0,
      0,
      this.screen.canvas.width - x,
      this.screen.canvas.height - y
    );

    // Bottom slice.
    this.screen.context.drawImage(
      pattern,
      0,
      y,
      x,
      this.screen.canvas.height - y,
      this.screen.canvas.width - x,
      0,
      x,
      this.screen.canvas.height - y
    );

    // Right slice.
    this.screen.context.drawImage(
      pattern,
      x,
      0,
      this.screen.canvas.width - x,
      y,
      0,
      this.screen.canvas.height - y,
      this.screen.canvas.width - x,
      y
    );

    // Bottom right corner.
    this.screen.context.drawImage(
      pattern,
      0,
      0,
      x,
      y,
      this.screen.canvas.width - x,
      this.screen.canvas.height - y,
      x,
      y
    );
  }
}

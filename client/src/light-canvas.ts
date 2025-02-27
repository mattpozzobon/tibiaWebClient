import Canvas from "./canvas";
import GameClient from "./gameclient";
import RGBA from "./rgba";

export default class LightCanvas extends Canvas {
  // Current state of the light canvas and start/target for interpolation.
  
  private __ambientColor: RGBA;
  private __ambientColorTarget: RGBA;
  private __ambientColorStart: RGBA;
  private __counter: number;
  private __steps: number;

  // Darkness is black.
  public readonly DARKNESS: RGBA = new RGBA(0, 0, 0, 255);

  constructor(id: string | null, width: number, height: number) {
    super( id, width, height);

    
    this.__ambientColor = new RGBA(0, 0, 0, 0);
    this.__ambientColorTarget = new RGBA(0, 0, 0, 0);
    this.__ambientColorStart = new RGBA(0, 0, 0, 0);
    this.__counter = 0;
    this.__steps = 0;
  }

  public setAmbientColor(r: number, g: number, b: number, a: number): void {
    // Store the start and target of the transition.
    this.__ambientColorTarget = new RGBA(r, g, b, a);
    this.__ambientColorStart = this.__ambientColor.copy();

    // Determine the length of transition (number of ticks to go from color one to another).
    const f1 = Math.abs(this.__ambientColorStart.r - this.__ambientColorTarget.r);
    const f2 = Math.abs(this.__ambientColorStart.g - this.__ambientColorTarget.g);
    const f3 = Math.abs(this.__ambientColorStart.b - this.__ambientColorTarget.b);
    const f4 = Math.abs(this.__ambientColorStart.a - this.__ambientColorTarget.a);

    // Reset the state.
    this.__steps = 2 * Math.max(f1, f2, f3, f4);
    this.__counter = this.__steps;
  }

  public getNightSine(): number {
    // Read the world time from the clock.
    const unix = window.gameClient.world.clock.getUnix();
    // Calculate the sine with an 1/8th PI offset.
    return Math.sin(0.25 * Math.PI + (2 * Math.PI * unix) / (24 * 60 * 60 * 1000));
  }

  public getDarknessFraction(): number {
    // Simulate the day & night cycle.
    let fraction = 0.5 * (this.getNightSine() + 1);
    // Underground is always in full darkness.
    if (window.gameClient.player!.isUnderground()) {
      fraction = 1;
    }
    return fraction;
  }

  public getInterpolationFraction(): number {
    return (this.__counter - 1) / this.__steps;
  }

  public setup(): void {
    // Clear lightscreen and create ambient color.
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.globalCompositeOperation = "source-over";

    // If we are still interpolating.
    if (this.__counter > 0) {
      this.__ambientColor = this.__ambientColorTarget.interpolate(
        this.__ambientColorStart,
        this.getInterpolationFraction()
      );
      this.__counter--;
    }

    // Interpolate with complete darkness to simulate night.
    const color = this.__ambientColor.interpolate(this.DARKNESS, this.getDarknessFraction());
    this.context.fillStyle = color.toString();
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get ready to XOR light bubbles.
    this.context.globalCompositeOperation = "xor";
  }

  public getGradient(x: number, y: number, size: number, color: number): CanvasGradient | null {
    // Make the density depend on the night fraction.
    const intensity = 0.5 * this.getDarknessFraction();

    // Invalid input.
    if (color < 0 || color >= 216) {
      return null;
    }

    // In Tibia color information, each channel has 6 colors scaled from 0 to 255.
    const r = 51 * (Math.floor(color / 36) % 6);
    const g = 51 * (Math.floor(color / 6) % 6);
    const b = 51 * (color % 6);

    // Create a radial gradient.
    const radgrad = this.context.createRadialGradient(x, y, 0, x, y, size);

    // Quadratic scaling of intensity.
    const a1 = Math.floor(0xff * intensity);
    const a2 = Math.floor(a1 * 0.5);
    const a3 = Math.floor(a2 * 0.5);
    const a4 = Math.floor(a3 * 0.5);

    // Add color stops to the radial gradient.
    radgrad.addColorStop(0.00, new RGBA(r, g, b, a1).toString());
    radgrad.addColorStop(0.25, new RGBA(r, g, b, a2).toString());
    radgrad.addColorStop(0.50, new RGBA(r, g, b, a3).toString());
    radgrad.addColorStop(0.75, new RGBA(r, g, b, a4).toString());
    radgrad.addColorStop(1.00, new RGBA(0, 0, 0, 0).toString());

    return radgrad;
  }

  public renderLightBubble(x: number, y: number, size: number, colorByte: number): void {
    // Scale to the gamescreen.
    x = 32 * x + 32;
    y = 32 * y + 32;
    size *= 32;

    const gradient = this.getGradient(x, y, size, colorByte);
    if (gradient === null) {
      return;
    }

    // Create the circle on the canvas.
    this.context.beginPath();
    this.context.fillStyle = gradient;
    this.context.arc(x, y, size, 0, 2 * Math.PI, false);
    this.context.fill();
  }
}

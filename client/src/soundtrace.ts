// Assuming gameClient is declared globally or imported appropriately.
declare const gameClient: any;

export default class SoundTrace {
  public element: HTMLAudioElement;
  private __volume: number;
  private __volumeTarget: number;
  private __volumeStart: number;
  private __steps: number;
  private __counter: number;
  private __playing: boolean;

  constructor(id: string) {
    const el = document.getElementById(id) as HTMLAudioElement | null;
    if (!el) {
      throw new Error(`Element with id ${id} not found`);
    }
    this.element = el;
    this.element.loop = true;

    this.__volume = 0;
    this.__volumeTarget = 0;
    this.__volumeStart = 0;
    this.__steps = 0;
    this.__counter = 0;
    this.__playing = false;
  }

  public start(): void {
    this.element.play();
    this.__playing = true;
  }

  public stop(): void {
    this.element.pause();
    this.element.currentTime = 0;
    this.__playing = false;
  }

  public tick(): void {
    if (this.__counter === 0) {
      return;
    }

    // Linear interpolation: gradually change volume.
    this.__volume =
      this.__volumeTarget +
      ((this.__counter - 1) / this.__steps) *
        (this.__volumeStart - this.__volumeTarget);
    this.__counter--;

    this.element.volume = this.__volume;

    // Start or stop the audio based on the volume.
    if (this.__volume === 0) {
      this.stop();
    } else if (!this.__playing) {
      this.start();
    }
  }

  public setVolume(volume: number): this {
    // Capture the current volume as the starting point.
    this.__volumeStart = this.__volume;
    // Ensure we do not exceed the master volume.
    this.__volumeTarget = Math.min(
      gameClient.interface.soundManager.__masterVolume,
      volume
    );
    // Calculate steps for volume change (rounded to an integer).
    this.__steps = (1E3 * Math.abs(this.__volume - this.__volumeTarget)) | 0;
    this.__counter = this.__steps;
    return this;
  }
}

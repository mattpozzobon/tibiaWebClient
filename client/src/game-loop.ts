export default class GameLoop {
  private __frameCallback: () => void;
  private __frame: number;
  private __running: boolean;
  private __aborted: boolean;
  private __initialized: number | null;

  constructor(frameCallback: () => void) {
    // Callback fired every frame.
    this.__frameCallback = frameCallback;
    // State initialization.
    this.__frame = 0;
    this.__running = false;
    this.__aborted = false;
    this.__initialized = null;
  }

  public getCurrentFrame(): number {
    return this.__frame;
  }

  public isRunning(): boolean {
    return this.__running;
  }

  public init(): void {
    // Already running.
    if (this.isRunning()) {
      return;
    }
    this.__initialized = performance.now();
    this.__aborted = false;
    this.__running = true;
    this.__loop();
  }

  public abort(): void {
    this.__aborted = true;
    this.__running = false;
  }

  private __loop(): void {
    this.__frame++;

    // If the loop was aborted, stop execution.
    if (this.__aborted) {
      return;
    }

    // Execute the frame callback.
    this.__frameCallback();

    // Schedule the next frame.
    requestAnimationFrame(this.__loop.bind(this));
  }
}

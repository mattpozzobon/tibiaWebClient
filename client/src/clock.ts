export default class Clock {
  // The phase offset of the clock provided by the server.
  private __phase: number;
  private __initialized: number;

  // Updated by the server configuration.
  public CLOCK_SPEED: number;

  constructor() {
    this.__phase = 0;
    this.__initialized = performance.now();
    this.CLOCK_SPEED = 0;
  }

  public setPhase(phase: number): void {
    // Sets the phase of the world clock.
    this.__phase = phase;
    this.__initialized = performance.now();
  }

  public getUnix(): number {
    // Returns the "Unix" time of the server in milliseconds,
    // wrapped around using modular arithmetic.
    return (
      (this.__phase +
        this.CLOCK_SPEED * (performance.now() - this.__initialized)) %
      (24 * 60 * 60 * 1000)
    );
  }

  public getTimeString(): string {
    // Returns the string representation of the world time as HH:MM.
    const unix = this.getUnix();
    const seconds = Math.floor(unix / 1000) % 60;
    const minutes = Math.floor(unix / (60 * 1000)) % 60;
    const hours = Math.floor(unix / (60 * 60 * 1000)) % 24;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  public updateClockDOM(): void {
    // Renders clock information to the DOM.
    const clockElement = document.getElementById("clock-time");
    if (clockElement) {
      clockElement.innerHTML = this.getTimeString();
    }
  }
}

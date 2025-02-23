import GameClient from "./gameclient";

// Helper clamp function.
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default class ScreenElement {
  public element: HTMLElement;
  public gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    this.gameClient = gameClient;
    const elem = document.getElementById(id);
    if (!elem) {
      throw new Error(`Element with id "${id}" not found.`);
    }
    // Clone the node deeply.
    this.element = elem.cloneNode(true) as HTMLElement;
    this.show();
  }

  public remove(): void {
    this.element.remove();
  }

  public hide(): void {
    this.element.style.display = "none";
  }

  public show(): void {
    this.element.style.display = "block";
  }

  public addBar(barType: string): HTMLElement {
    // Create the bar container.
    const barContainer = document.createElement("div");
    barContainer.className = "character-element-bar";

    // Create the inner bar.
    const barValue = document.createElement("div");
    barValue.className = `value-${barType}`;
    barContainer.appendChild(barValue);

    // Append to the main element.
    this.element.appendChild(barContainer);

    return barValue;
  }

  public __updateTextPosition(offset: { left: number; top: number }): void {
    // Get the bounding rectangle of the game screen canvas.
    const rect = this.gameClient.renderer.screen.canvas.getBoundingClientRect();

    // Clamp the position within the screen bounds.
    const left = clamp(offset.left, 0, rect.width - this.element.offsetWidth);
    const top = clamp(offset.top, 0, rect.height - this.element.offsetHeight);

    // Apply the transform.
    this.element.style.transform = `translate(${left}px, ${top}px)`;

    // Defer showing the element to prevent glitchy behavior.
    setTimeout(() => this.show());
  }

  public __getAbsoluteOffset(position: { x: number; y: number; z?: number }): { left: number; top: number } {
    // Determine the fraction based on the screen size.
    const fraction = this.gameClient.interface.getSpriteScaling();
    // Calculate centered offsets.
    const left = fraction * position.x - 0.5 * this.element.offsetWidth;
    const top = fraction * position.y - 0.5 * this.element.offsetHeight;
    return { left, top };
  }
}

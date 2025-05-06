import GameClient from "./gameclient";

// Helper clamp function.
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default class ScreenElement {
  public element: HTMLElement;
  

  constructor(id: string) {
    
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
    this.element.style.left = `${offset.left}px`;
    this.element.style.top = `${offset.top}px`;
  }

  public __getAbsoluteOffset(position: { x: number; y: number; z?: number }): { left: number; top: number } {
    // Determine the fraction based on the screen size.
    const fraction = window.gameClient.interface.getSpriteScaling();
    // Calculate centered offsets.
    const left = fraction * position.x - 0.5 * this.element.offsetWidth;
    const top = fraction * position.y - 0.5 * this.element.offsetHeight;
    return { left, top };
  }
}

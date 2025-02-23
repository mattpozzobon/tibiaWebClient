import GameClient from "./gameclient";
import Canvas from "./canvas";

// Define a simple Spell interface.
interface Spell {
  sid: number;
  icon: { x: number; y: number };
}

// Define the structure of a hotbar slot.
interface HotbarSlot {
  canvas: Canvas;
  duration: HTMLElement;
  spell: Spell | null;
}

export default class HotbarManager {
  gameClient: GameClient;
  slots: HotbarSlot[];
  ICONS: HTMLImageElement;
  GRADIENTS: CanvasGradient[] = [];
  private __currentDragElement: HTMLElement | null;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    this.__currentDragElement = null;
    

    // Get all elements with the class "hotbar-item" from the DOM.
    const hotbarElements = Array.from(
      document.querySelectorAll(".hotbar-item")
    ) as HTMLElement[];

    // Attach click event listeners to each hotbar element.
    hotbarElements.forEach(this.__addClickEventListeners.bind(this));

    // Create a slot for each hotbar element.
    this.slots = hotbarElements.map((el) => this.__createSlot(el));

    // Initialize the hotbar icons.
    this.ICONS = new Image();
    this.ICONS.src = "./png/icons.png";

    // Create the conic gradients lookup table.
    this.__createConicGradients();
  }

  public addSlot(index: number, sid: number): void {
    if (index < 0 || index >= this.slots.length) return;

    // Get the spell details from the game interface.
    const spell = this.gameClient.interface.getSpell(sid);

    // Set the new spell reference in the slot.
    this.slots[index].spell = { sid, icon: spell.icon };

    // Update the DOM: set the text color and title.
    const parent = this.slots[index].canvas.canvas.parentNode;
    if (parent && parent.lastElementChild instanceof HTMLElement) {
      parent.lastElementChild.style.color = "white";
      (parent as HTMLElement).title = `${spell.name}: ${spell.description}`;
    }
    this.__saveConfiguration();
  }

  public clearSlot(index: number): void {
    const slot = this.slots[index];
    slot.spell = null;
    slot.canvas.clear();

    const parent = slot.canvas.canvas.parentNode;
    if (parent && parent.lastElementChild instanceof HTMLElement) {
      parent.lastElementChild.style.color = "grey";
    }
    this.__saveConfiguration();
  }

  public handleKeyPress(key: number): void {
    // For this example, we assume F1 corresponds to key code 112.
    const F1_KEY = 112;
    this.__handleClick(key - F1_KEY);
  }

  public render(): void {
    this.slots.forEach((slot) => {
      if (slot.spell === null) return;

      // Draw the spell icon on the slot's canvas.
      slot.canvas.context.drawImage(
        this.ICONS,
        32 * slot.spell.icon.x,
        32 * slot.spell.icon.y,
        32,
        32,
        0,
        0,
        32,
        32
      );

      // Get the cooldown fraction for the spell.
      const fraction = this.gameClient.player!.spellbook.getCooldownFraction(
        slot.spell.sid
      );
      if (fraction < 1) {
        this.__applyCooldownEffect(fraction, slot);
      }
      if (fraction === 1) {
        slot.duration.innerHTML = "";
      }
    });
  }

  private __applyCooldownEffect(fraction: number, slot: HotbarSlot): void {
    slot.canvas.context.fillStyle = this.__getConicGradient(fraction);
    slot.canvas.context.fillRect(0, 0, 32, 32);

    const seconds =
      this.gameClient.player!.spellbook.getCooldownSeconds(slot.spell!.sid);
    if (seconds > 60) {
      slot.duration.innerHTML = `${(seconds / 60).toFixed(1)}m`;
    } else {
      slot.duration.innerHTML = `${seconds.toFixed(1)}s`;
    }
  }

  private __getConicGradient(fraction: number): CanvasGradient {
    // Clamp fraction between 0 and 1.
    const clamped = Math.min(1, Math.max(0, fraction));
    const index = Math.round(360 * (clamped % 1));
    return this.GRADIENTS[index];
  }

  private __addClickEventListeners(DOMElement: HTMLElement, i: number): void {
    DOMElement.addEventListener("click", this.__handleClick.bind(this, i));
  }

  private __handleLightUp(slot: HotbarSlot): void {
    const parent = slot.canvas.canvas.parentNode as HTMLElement;
    if (parent) {
      parent.className = "hotbar-item active";
      setTimeout(() => {
        parent.className = "hotbar-item";
      }, 250);
    }
  }

  private __handleClick(i: number): void {
    const slot = this.slots[i];
    this.__handleLightUp(slot);
    if (slot.spell === null) return;
    this.gameClient.player!.spellbook.castSpell(slot.spell.sid);
  }

  private __createSlot(DOMElement: HTMLElement): HotbarSlot {
    // Assume DOMElement.firstElementChild is the canvas container.
    const firstChild = DOMElement.firstElementChild as HTMLElement;
    const canvasInstance = new Canvas(this.gameClient, firstChild as HTMLCanvasElement, 32, 32);
    return {
      canvas: canvasInstance,
      duration: DOMElement.children[1] as HTMLElement,
      spell: null,
    };
  }

  private __createConicGradients(): void {
    const temp = new Canvas(this.gameClient, null, 32, 32);
    const gradients: CanvasGradient[] = [];
    for (let i = 0; i < 360; i++) {
      gradients.push(this.__createConicGradient(i / 360, temp.context));
    }
    this.GRADIENTS = gradients;
  }

  private __createConicGradient(
    fraction: number,
    context: CanvasRenderingContext2D
  ): CanvasGradient {
    const gradient = context.createConicGradient(fraction * 2 * Math.PI, 16, 16);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    gradient.addColorStop(1 - fraction, "rgba(0, 0, 0, 0.75)");
    gradient.addColorStop(1 - fraction, "rgba(0, 0, 0, 0)");
    return gradient;
  }

  __loadConfiguration(): void {
    const storage = localStorage.getItem("hotbar");
    if (storage === null) return;
    JSON.parse(storage).forEach((x: any, i: number) => {
      if (x !== null) {
        this.addSlot(i, x.sid);
      }
    });
  }

  private __saveConfiguration(): void {
    localStorage.setItem(
      "hotbar",
      JSON.stringify(this.slots.map((x) => x.spell))
    );
  }
}

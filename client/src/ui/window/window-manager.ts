import State from "../../core/state";
import InteractiveWindow from "./window";
// Window classes removed - now handled by React components


export default class WindowManager {
  public windows: { [name: string]: InteractiveWindow };
  public stacks: HTMLCollectionOf<Element>;
  public state: State;

  constructor() {
    // Window system now handled by React components
    this.windows = {}; // Empty - React components handle windows

    this.stacks = document.getElementsByClassName("column");
    // No event listeners - React components handle their own interactions

    // Initialize state. 
    // If state.add expects a callback function, we supply a no‑op arrow function.
    this.state = new State();
    this.state.add("currentDragElement", () => null);
    this.state.add("currentMouseElement", () => null);
    this.state.add("mouseDownTarget", () => null);
    this.state.add("currentDragElementOffset", () => null);

    // Mouse move/up events
    document.addEventListener("mousemove", this.__handleMove.bind(this));
    document.addEventListener("mouseup", this.__handleMouseUp.bind(this));

    // Register event listeners on all windows.
    Object.values(this.windows).forEach((gameWindow) => this.register(gameWindow));
  }

  public register(gameWindow: InteractiveWindow): void {
    this.__addListeners(gameWindow);
  }

  public getWindow(name: string): InteractiveWindow | null {
    if (!this.windows.hasOwnProperty(name)) {
      return null;
    }
    return this.windows[name];
  }

  private __addListeners(gameWindow: InteractiveWindow): void {
    // Assuming that InteractiveWindow exposes its root element as __element
    gameWindow.__element.addEventListener("dragstart", this.__handleDragStart.bind(this));
    gameWindow.__element.addEventListener("dragend", this.__handleDragEnd.bind(this));
    gameWindow.__element.addEventListener("mousedown", this.__handleMouseDown.bind(this, gameWindow));
  }

  public closeAll(): void {
    Object.values(this.windows).forEach((gameWindow) => gameWindow.close());
  }

  public getStack(stack: string): HTMLElement | undefined {
    switch (stack) {
      case "left":
        return this.stacks[0] as HTMLElement;
      case "right":
        return this.stacks[1] as HTMLElement;
      default:
        console.error("Unknown stack requested.");
        return undefined;
    }
  }

  private __attachStackEventListeners(stacks: HTMLCollectionOf<Element>): void {
    // Stack event listeners now handled by React components
  }

  private __handleMove(event: MouseEvent): void {
    if (this.state.currentMouseElement === null) {
      return;
    }
    const body = this.state.currentMouseElement.getBody ? this.state.currentMouseElement.getBody() : null;
    if (body) {
      body.style.height = (event.clientY - body.offsetTop - 12) + "px";
    }
  }

  private __handleWindowDrop(event: DragEvent): void {
    let element = event.target as HTMLElement;
    if (this.state.currentDragElement === null) {
      return;
    }
    // Dropped in the stack element itself: append the element
    if (element.className === "column") {
      element.append(this.state.currentDragElement);
      return;
    }
    // Walk up the DOM tree until we find an element whose parent has class "column"
    while (element.parentElement && element.parentElement.className !== "column") {
      element = element.parentElement;
    }
    if (element === this.state.currentDragElement) {
      return;
    }
    if (element.previousSibling === this.state.currentDragElement) {
      element.parentNode?.insertBefore(element, this.state.currentDragElement);
    } else {
      element.parentNode?.insertBefore(this.state.currentDragElement, element);
    }
  }

  private __handleDragEnd(event: DragEvent): void {
    if (this.state.currentDragElement && this.state.currentDragElement.children[1]) {
      this.state.currentDragElement.children[1].scrollTop = this.state.currentDragElementOffset!;
    }
    this.state.currentDragElement = null;
    this.state.currentDragElementOffset = null;
    (event.target as HTMLElement).style.opacity = "1";
  }

  private __handleMouseDown(gameWindow: InteractiveWindow, event: MouseEvent): void {
    this.state.mouseDownTarget = event.target;
    if ((event.target as HTMLElement).className === "footer") {
      this.state.currentMouseElement = gameWindow;
    }
  }

  private __handleDragStart(event: DragEvent): void {
    if (!event.target) return;
    const target = event.target as HTMLElement;
    if (!this.state.mouseDownTarget || target.className !== "header") {
      event.preventDefault();
      return;
    }
    this.state.currentDragElement = target;
    // Ensure the target has at least two children before accessing children[1]
    if (target.children.length > 1) {
      this.state.currentDragElementOffset = (target.children[1] as HTMLElement).scrollTop;
    }
    target.style.opacity = "0.25";
  }
  

  private __handleMouseUp(event: MouseEvent): void {
    this.state.currentMouseElement = null;
  }
}

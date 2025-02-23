export default class Menu {
  public element: HTMLElement;
  public downEvent: Event | null;
  // Default "click" callback: subclasses should override this.
  public click: (event: Event) => any = () => {};

  constructor(id: string) {
    const elem = document.getElementById(id);
    if (!elem) {
      throw new Error(`Element with id "${id}" not found.`);
    }
    this.element = elem;
    this.downEvent = null;
    this.__addEventListeners();
  }

  private __addEventListeners(): void {
    // Get all button elements within the menu.
    const buttons = Array.from(this.element.getElementsByTagName("button"));
    buttons.forEach((button) => {
      button.addEventListener("click", this.buttonClose.bind(this));
    });
  }

  protected __getAction(event: Event): string | null {
    const target = event.target as HTMLElement;
    return target.getAttribute("action");
  }

  public open(event: Event): this {
    this.element.style.display = "block";
    this.updateElementPosition(event);
    this.downEvent = event;
    return this;
  }

  public updateElementPosition(event: Event): void {
    // Cast the event to MouseEvent to access pageX/pageY.
    const mouseEvent = event as MouseEvent;
    const bodyWidth = document.body.offsetWidth;
    const bodyHeight = document.body.offsetHeight;
    const elemWidth = this.element.offsetWidth;
    const elemHeight = this.element.offsetHeight;
    const left = Math.min(bodyWidth - elemWidth, Math.floor(mouseEvent.pageX));
    const top = Math.min(bodyHeight - elemHeight, Math.floor(mouseEvent.pageY));
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  public close(): void {
    this.element.style.display = "none";
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  public buttonClose(event: Event): void {
    // If the click callback returns a truthy value, close the menu.
    if (this.click(event)) {
      this.close();
    }
  }
}

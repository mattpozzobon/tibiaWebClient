declare const gameClient: any; // Adjust the type as needed

export default class Modal {
  public element: HTMLElement;
  public isOpen: boolean;

  // Subclasses may override these:
  public handleConfirm: () => boolean = () => true;
  public handleCancel: () => boolean = () => true;
  public handleOpen: (options?: any) => void = () => {};
  public handleRender: () => void = () => {};

  constructor(id: string) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Element with id "${id}" not found.`);
    }
    this.element = el;
    this.isOpen = false;

    // Add event listeners to each button with an "action" attribute.
    Array.from(this.element.querySelectorAll("button[action]")).forEach(
      this.__addAction.bind(this)
    );
  }

  public show(): void {
    // Centering the modal: resetting left and top.
    this.element.style.left = "";
    this.element.style.top = "";
    this.element.style.display = "block";
    this.isOpen = true;
  }

  public close(): void {
    this.element.style.display = "none";
    this.isOpen = false;
  }

  public isOpened(): boolean {
    return this.isOpen;
  }

  public setTitle(title: string): void {
    // Capitalize title: simple implementation.
    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
    const header = this.element.querySelector(".modal-header");
    if (header) {
      header.innerHTML = capitalizedTitle;
    }
  }

  private __addAction(element: Element): void {
    element.addEventListener("click", this.__buttonClick.bind(this));
  }

  private __internalButtonClick(target: HTMLElement): boolean {
    const action = target.getAttribute("action");
    switch (action) {
      case "cancel":
        return this.handleCancel();
      case "confirm":
        return this.handleConfirm();
      default:
        return false;
    }
  }

  __buttonClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.__internalButtonClick(target)) {
      // If the action returns true, close the modal via the global gameClient.
      gameClient.interface.modalManager.close();
    }
  }
}

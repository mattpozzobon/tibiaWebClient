export default class Modal {
  public element: HTMLElement;
  public isOpen: boolean;
  public id: string;

  constructor(id: string) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Element with id "${id}" not found.`);
    }
    this.id = id;
    this.element = el;
    this.isOpen = false;

    Array.from(this.element.querySelectorAll("button[action]")).forEach(
      this.__addAction.bind(this)
    );
  }

  public getElement(selector: string): HTMLElement | null {
    return this.element.querySelector(selector);
  }

  public show(): void {
    this.element.style.left = "";
    this.element.style.top = "";
    this.element.style.display = "block";
    this.isOpen = true;
  }

  public isOpened(): boolean {
    return this.isOpen;
  }

  public setTitle(title: string): void {
    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);
    const header = this.element.querySelector(".modal-header");
    if (header) {
      header.innerHTML = capitalizedTitle;
    }
  }

  protected __addAction(element: Element): void {
    element.addEventListener("click", this.__buttonClick.bind(this));
  }

  protected __internalButtonClick(target: HTMLElement): boolean {
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

  protected __buttonClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.__internalButtonClick(target)) {
      window.gameClient.interface.modalManager.close();
    }
  }

  // These can now be overridden cleanly by subclasses
  public handleConfirm(): boolean {
    return true;
  }

  public close(): void {
    this.element.style.display = "none";
    this.isOpen = false;
  }

  public handleCancel(): boolean {
    return true;
  }

  public handleOpen(options?: any): void {
    console.log('BASIC MODAL OPEN', this.id);
  }

  public handleRender(): void {
    // noop
  }
}

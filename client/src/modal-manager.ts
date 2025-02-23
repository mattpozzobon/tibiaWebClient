import GameClient from "./gameclient";
import Modal from "./modal";
import OutfitModal from "./modal-outfit";
import MoveItemModal from "./modal-move-item";
import ChatModal from "./modal-chat";
import EnterNameModal from "./modal-enter-name";
import ConfirmModal from "./modal-confirm";
import TextModal from "./modal-text";
import CreateAccountModal from "./modal-create-account";
import ReadableModal from "./modal-readable";
import OfferModal from "./modal-offer";
import MapModal from "./modal-map";
import SpellbookModal from "./modal-spellbook";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type ModalConstructor =
  | (new (id: string) => Modal)
  | (new (gameClient: GameClient, id: string) => Modal);

export default class ModalManager {
  gameClient: GameClient;
  private __openedModal: Modal | null;
  private __modals: { [id: string]: Modal };

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    this.__openedModal = null;
    this.__modals = {};

    // Register all the modals.
    this.register(OutfitModal, "outfit-modal");
    this.register(MoveItemModal, "move-item-modal");
    this.register(ChatModal, "chat-modal");
    this.register(Modal, "settings-modal");
    this.register(EnterNameModal, "enter-name-modal");
    this.register(ConfirmModal, "confirm-modal");
    this.register(TextModal, "floater-connecting");
    this.register(Modal, "settings-box");
    this.register(Modal, "floater-enter");
    this.register(CreateAccountModal, "floater-create");
    this.register(Modal, "information-modal");
    this.register(ReadableModal, "readable-modal");
    this.register(OfferModal, "offer-modal");
    this.register(MapModal, "map-modal");
    this.register(SpellbookModal, "spellbook-modal");

    this.__addEventListeners();
  }

  private __addEventListeners(): void {
    document.getElementById("open-chat-modal")?.addEventListener("click", this.open.bind(this, "chat-modal"));
    document.getElementById("openOutfit")?.addEventListener("click", this.open.bind(this, "outfit-modal"));
    document.getElementById("openSettings")?.addEventListener("click", this.open.bind(this, "settings-modal"));
    document.getElementById("information")?.addEventListener("click", this.open.bind(this, "information-modal"));
    document.getElementById("login-info")?.addEventListener("click", this.open.bind(this, "floater-enter"));
    document.getElementById("create-account")?.addEventListener("click", this.open.bind(this, "floater-create"));
    document.getElementById("settings")?.addEventListener("click", this.open.bind(this, "settings-box"));
  
    Array.from(document.querySelectorAll(".modal-header")).forEach(header => {
      header.addEventListener("mousedown", this.__handleHeaderMouseDown.bind(this));
    });
  }

  /**
   * Handles dragging of modal windows. The event listener is attached to modal header elements.
   */
  private __handleHeaderMouseDown(event: any): void {
    event.preventDefault();
    const headerElement = event.currentTarget as HTMLElement;
    const manager = this; // capture the ModalManager instance

    const __handleRelease = (releaseEvent: MouseEvent): void => {
      releaseEvent.preventDefault();
      document.removeEventListener("mousemove", __handleDrag);
      document.removeEventListener("mouseup", __handleRelease);
    };

    const __handleDrag = (dragEvent: MouseEvent): void => {
      dragEvent.preventDefault();
      const rect = manager.gameClient.renderer.screen.canvas.getBoundingClientRect();
      const modalElement = headerElement.parentElement;
      if (!modalElement) return;
      let left = dragEvent.clientX - rect.left - 0.5 * modalElement.offsetWidth;
      let top = dragEvent.clientY - rect.top - 0.5 * headerElement.offsetHeight;
      left = clamp(left, 0, rect.width - modalElement.offsetWidth);
      top = clamp(top, 0, rect.height - modalElement.offsetHeight);
      modalElement.style.left = `${left}px`;
      modalElement.style.top = `${top}px`;
    };

    document.addEventListener("mousemove", __handleDrag);
    document.addEventListener("mouseup", __handleRelease);
  }

  /**
   * Registers a modal class with a given identifier.
   */
  

  public register(ModalClass: ModalConstructor, id: string): void {
    if (this.__modals.hasOwnProperty(id)) {
      console.error("A modal with identifier " + id + " already exists.");
      return;
    }
    
    let instance: Modal;
    // ModalClass.length gives the number of expected parameters.
    if (ModalClass.length === 1) {
      instance = new (ModalClass as new (id: string) => Modal)(id);
    } else {
      instance = new (ModalClass as new (gameClient: GameClient, id: string) => Modal)(this.gameClient, id);
    }
    this.__modals[id] = instance;
  }

  /**
   * Delegates the confirm action to the currently opened modal.
   */
  public handleConfirm(): void {
    if (!this.isOpened()) return;
    this.__openedModal!.handleConfirm();
    this.close();
  }

  /**
   * Closes the currently opened modal.
   */
  public close(): void {
    if (!this.isOpened()) return;
    this.__openedModal!.element.style.display = "none";
    this.__openedModal = null;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  /**
   * Renders the currently opened modal.
   */
  public render(): void {
    if (!this.isOpened()) return;
    this.__openedModal!.handleRender();
  }

  /**
   * Returns the modal registered with the given identifier, or null if not found.
   */
  public get(id: string): Modal | null {
    return this.__modals.hasOwnProperty(id) ? this.__modals[id] : null;
  }

  /**
   * Returns true if a modal is currently opened.
   */
  public isOpened(): boolean {
    return this.__openedModal !== null;
  }

  /**
   * Opens the modal with the given identifier and passes optional options to it.
   */
  public open(id: string, options?: any): Modal | null {
    if (!this.__modals.hasOwnProperty(id)) {
      return null;
    }
    if (this.isOpened()) {
      this.close();
    }
    this.__openedModal = this.get(id);
    this.__openedModal!.show();
    this.__openedModal!.handleOpen(options);
    return this.__openedModal;
  }
}

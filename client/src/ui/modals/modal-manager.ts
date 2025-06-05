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
import SkillModal from "./modal-skills";


type ModalConstructor = (new (id: string) => Modal);

export default class ModalManager {
  private __openedModal: Modal | null;
  private __modals: { [id: string]: Modal };

  constructor() {
    
    this.__openedModal = null;
    this.__modals = {};

    // Register all the modals.
    this.register(Modal, "information-modal");
    this.register(Modal, "settings-modal");
    this.register(Modal, "settings-box");
    this.register(Modal, "floater-enter");
    this.register(SkillModal, "skill-modal");

    this.register(OutfitModal, "outfit-modal");
    this.register(MoveItemModal, "move-item-modal");

    this.register(ChatModal, "chat-modal");
    this.register(EnterNameModal, "enter-name-modal");
    this.register(ConfirmModal, "confirm-modal");
    this.register(TextModal, "floater-connecting");
    this.register(CreateAccountModal, "floater-create");
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
    document.getElementById("openSkills")?.addEventListener("click", this.open.bind(this, "skill-modal"));

    Array.from(document.querySelectorAll(".modal-header")).forEach(header => {
      header.addEventListener("mousedown", this.__handleHeaderMouseDown.bind(this) as EventListener);
    });
  }

  /**
   * Handles dragging of modal windows. The event listener is attached to modal header elements.
   */
  private __handleHeaderMouseDown(event: MouseEvent): void {
    event.preventDefault();
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
      instance = new (ModalClass as new (id: string) => Modal)(id);
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
    // If the modal is already opened and it's the same one, close it (toggle off)
    if (this.isOpened() && this.__openedModal?.id === id) {
      this.close();
      return null;
    }
  
    // If another modal is opened, close it first
    if (this.isOpened()) {
      this.close();
    }
  
    // Open the requested modal
    if (!this.__modals.hasOwnProperty(id)) {
      return null;
    }
  
    this.__openedModal = this.get(id);
    this.__openedModal!.show();
    this.__openedModal!.handleOpen(options);
    return this.__openedModal;
  }
  
}

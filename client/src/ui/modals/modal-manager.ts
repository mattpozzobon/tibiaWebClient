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
import LoginModal from "./modal-login";
import RecoverAccountModal from "./modal-recover-account";


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
    this.register(LoginModal, "floater-enter");
    this.register(RecoverAccountModal, "floater-recover");
    this.register(CreateAccountModal, "floater-create");
    this.register(SkillModal, "skill-modal");
    this.register(OutfitModal, "outfit-modal");
    this.register(MoveItemModal, "move-item-modal");
    this.register(ChatModal, "chat-modal");
    this.register(EnterNameModal, "enter-name-modal");
    this.register(ConfirmModal, "confirm-modal");
    this.register(TextModal, "floater-connecting");
    this.register(ReadableModal, "readable-modal");
    this.register(OfferModal, "offer-modal");
    this.register(MapModal, "map-modal");
    this.register(SpellbookModal, "spellbook-modal");
  }

  public addEventListeners(): void {
    document.getElementById("login-info")?.addEventListener("click", this.open.bind(this, "floater-enter"));
    document.getElementById("create-account")?.addEventListener("click", this.open.bind(this, "floater-create"));
    document.getElementById("recover-account")?.addEventListener("click", this.open.bind(this, "floater-recover"));
    document.getElementById("open-chat-modal")?.addEventListener("click", this.open.bind(this, "chat-modal"));
    document.getElementById("openOutfit")?.addEventListener("click", this.open.bind(this, "outfit-modal"));
    document.getElementById("openSettings")?.addEventListener("click", this.open.bind(this, "settings-modal"));
    document.getElementById("settings")?.addEventListener("click", this.open.bind(this, "settings-box"));
    document.getElementById("openSkills")?.addEventListener("click", this.open.bind(this, "skill-modal"));

    Array.from(document.querySelectorAll(".modal-header")).forEach(header => {
      header.addEventListener("mousedown", this.__handleHeaderMouseDown.bind(this) as EventListener);
    });
  }

  private __handleHeaderMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }
  
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

  public handleConfirm(): void {
    if (!this.isOpened()) return;
    this.__openedModal!.handleConfirm();

    if (!this.isAuthFormModal()) {
      this.handleEscape();
    }
  }

  public handleEscape(): void {
    if (!this.__openedModal) return;
  
    if (this.isLoginModal()) {
      return;
    }
  
    if (this.isAuthFormModal()) {
      this.close();
      this.open("floater-enter");
      return;
    }
  
    this.close();
  }

  public close(): void {
    if (!this.isOpened()) return;  // Let the modal handle its own closing behavior
    this.__openedModal!.close();
    this.__openedModal = null;
  }

  public render(): void {
    if (!this.isOpened()) return;
    this.__openedModal!.handleRender();
  }

  public get(id: string): Modal | null {
    return this.__modals.hasOwnProperty(id) ? this.__modals[id] : null;
  }

  public isOpened(): boolean {
    return this.__openedModal !== null;
  }

  public open(id: string, options?: any): Modal | null {
    // toggle-off if same panel
    if (this.isOpened() && this.__openedModal?.id === id) {
      this.close();
      return null;
    }

    // if another modal is open, close it
    if (this.isOpened()) {
      this.close();
    }

    // only continue if we actually registered it
    if (!this.__modals.hasOwnProperty(id)) {
      return null;
    }

    console.log('open modal', id);
    // show the one we want
    this.__openedModal = this.get(id);
    this.__openedModal!.show();
    this.__openedModal!.handleOpen(options);
    return this.__openedModal;
  }
  
  public getOpenedModal(): string | null {
    return this.__openedModal ? this.__openedModal.id : null;
  }

  private isAuthFormModal(): boolean {
    const id = this.__openedModal?.id;
    return id === "floater-create" || id === "floater-recover";
  }
  
  private isLoginModal(): boolean {
    return this.__openedModal?.id === "floater-enter";
  }
}

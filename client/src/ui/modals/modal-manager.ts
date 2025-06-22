import Modal from "./modal";
import LoginModal from "./modal-login";
import CreateAccountModal from "./modal-create-account";
import RecoverAccountModal from "./modal-recover-account";
import CharacterCreatorModal from "./modal-character-creator";
import CharacterSelectorModal from "./modal-character-select";
import OutfitModal from "./modal-outfit";
import MoveItemModal from "./modal-move-item";
import ChatModal from "./modal-chat";
import EnterNameModal from "./modal-enter-name";
import ConfirmModal from "./modal-confirm";
import ReadableModal from "./modal-readable";
import OfferModal from "./modal-offer";
import MapModal from "./modal-map";
import SpellbookModal from "./modal-spellbook";
import SkillModal from "./modal-skills";
import TextModal from "./modal-text";

const MODAL_IDS = {
  LOGIN: "floater-enter",
  CREATE_ACCOUNT: "floater-create",
  RECOVER_ACCOUNT: "floater-recover",
  
  CHARACTER_SELECTOR: "character-selector",
  CHARACTER_CREATOR: "character-creator",
  
  SETTINGS: "settings-modal",
  SKILL: "skill-modal",
  OUTFIT: "outfit-modal",
  MOVE_ITEM: "move-item-modal",
  CHAT: "chat-modal",
  ENTER_NAME: "enter-name-modal",
  CONFIRM: "confirm-modal",
  READABLE: "readable-modal",
  OFFER: "offer-modal",
  MAP: "map-modal",
  SPELLBOOK: "spellbook-modal",

  CONNECTING: "floater-connecting"
} as const;

const ELEMENT_IDS = {
  CREATE_ACCOUNT: "create-account",
  RECOVER_ACCOUNT: "recover-account",
  OPEN_CHAT_MODAL: "open-chat-modal",
  OPEN_OUTFIT: "openOutfit",
  OPEN_SETTINGS: "openSettings",
  OPEN_SKILLS: "openSkills",
  TOPBAR_PLAY_BTN: "topbar-play-btn",
  TOPBAR_NEWS_BTN: "topbar-news-btn"
} as const;

type ModalConstructor = new (id: string) => Modal;

interface ModalOptions {
  [key: string]: any;
}

export default class ModalManager {
  private openedModal: Modal | null = null;
  private modals: Map<string, Modal> = new Map();

  constructor() {
    this.registerModals();
  }

  private registerModals(): void {
    const modalRegistrations = [
      [CharacterSelectorModal, MODAL_IDS.CHARACTER_SELECTOR],
      [CharacterCreatorModal, MODAL_IDS.CHARACTER_CREATOR],
      [Modal, MODAL_IDS.SETTINGS],
      [LoginModal, MODAL_IDS.LOGIN],
      [RecoverAccountModal, MODAL_IDS.RECOVER_ACCOUNT],
      [CreateAccountModal, MODAL_IDS.CREATE_ACCOUNT],
      [SkillModal, MODAL_IDS.SKILL],
      [OutfitModal, MODAL_IDS.OUTFIT],
      [MoveItemModal, MODAL_IDS.MOVE_ITEM],
      [ChatModal, MODAL_IDS.CHAT],
      [EnterNameModal, MODAL_IDS.ENTER_NAME],
      [ConfirmModal, MODAL_IDS.CONFIRM],
      [TextModal, MODAL_IDS.CONNECTING],
      [ReadableModal, MODAL_IDS.READABLE],
      [OfferModal, MODAL_IDS.OFFER],
      [MapModal, MODAL_IDS.MAP],
      [SpellbookModal, MODAL_IDS.SPELLBOOK]
    ] as const;

    modalRegistrations.forEach(([ModalClass, id]) => {
      this.register(ModalClass, id);
    });
  }

  private register(ModalClass: ModalConstructor, id: string): void {
    if (this.modals.has(id)) {
      console.error(`A modal with identifier "${id}" already exists.`);
      return;
    }
    
    const instance = new ModalClass(id);
    this.modals.set(id, instance);
  }

  public addEventListeners(): void {
    this.addModalTriggerListeners();
    this.addTopbarListeners();
    this.addModalHeaderListeners();
  }

  private addModalTriggerListeners(): void {
    const triggerMappings = [
      [ELEMENT_IDS.CREATE_ACCOUNT, MODAL_IDS.CREATE_ACCOUNT],
      [ELEMENT_IDS.RECOVER_ACCOUNT, MODAL_IDS.RECOVER_ACCOUNT],
      [ELEMENT_IDS.OPEN_CHAT_MODAL, MODAL_IDS.CHAT],
      [ELEMENT_IDS.OPEN_OUTFIT, MODAL_IDS.OUTFIT],
      [ELEMENT_IDS.OPEN_SETTINGS, MODAL_IDS.SETTINGS],
      [ELEMENT_IDS.OPEN_SKILLS, MODAL_IDS.SKILL]
    ] as const;

    triggerMappings.forEach(([elementId, modalId]) => {
      const element = document.getElementById(elementId);
      element?.addEventListener("click", () => this.open(modalId));
    });
  }

  private addTopbarListeners(): void {
    const topbarPlayBtn = document.getElementById(ELEMENT_IDS.TOPBAR_PLAY_BTN);
    const topbarNewsBtn = document.getElementById(ELEMENT_IDS.TOPBAR_NEWS_BTN);

    topbarPlayBtn?.addEventListener("click", () => {
      window.gameClient.interface.loginFlowManager.showPostLogin();
    });

    topbarNewsBtn?.addEventListener("click", () => {
      window.gameClient.interface.loginFlowManager.showChangelog();
    });
  }

  private addModalHeaderListeners(): void {
    const modalHeaders = document.querySelectorAll(".modal-header");
    modalHeaders.forEach(header => {
      header.addEventListener("mousedown", this.handleHeaderMouseDown.bind(this) as EventListener);
    });
  }

  private handleHeaderMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  public open(id: string, options?: ModalOptions): Modal | null {
    if (this.isOpened() && this.openedModal?.id === id && this.openedModal.shouldStayOpenOnReopen()) {
      return null;
    }

    if (this.isOpened() && this.openedModal?.id === id) {
      this.close();
      return null;
    }

    if (this.isOpened()) {
      this.close();
    }

    const modal = this.get(id);
    if (!modal) {
      return null;
    }

    this.openedModal = modal;
    modal.show();
    modal.handleOpen(options);
    return modal;
  }

  public close(): void {
    if (!this.isOpened()) return;
    
    this.openedModal!.close();
    this.openedModal = null;
  }

  public get(id: string): Modal | null {
    return this.modals.get(id) || null;
  }

  public isOpened(): boolean {
    return this.openedModal !== null;
  }

  public getOpenedModal(): string | null {
    return this.openedModal?.id || null;
  }

  public handleConfirm(): void {
    if (!this.isOpened()) return;
    
    this.openedModal!.handleConfirm();

    if (!this.isAuthFormModal()) {
      this.handleEscape();
    }
  }

  public handleEscape(): void {
    if (!this.openedModal) return;

    if (this.openedModal.shouldStayOpenOnReopen()) {
      return;
    }

    if (this.isAuthFormModal()) {
      this.close();
      this.open(MODAL_IDS.LOGIN);
      return;
    }

    this.close();
  }

  public render(): void {
    if (!this.isOpened()) return;
    this.openedModal!.handleRender();
  }

  private isAuthFormModal(): boolean {
    const id = this.openedModal?.id;
    return id === MODAL_IDS.CREATE_ACCOUNT || id === MODAL_IDS.RECOVER_ACCOUNT;
  }
}

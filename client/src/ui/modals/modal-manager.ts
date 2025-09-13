import Modal from "./modal";
// All modal classes removed - now handled by React components

const MODAL_IDS = {
  SETTINGS: "settings-modal",
  SKILL: "skill-modal",
  OUTFIT: "outfit-modal",
  MOVE_ITEM: "move-item-modal",
  // CHAT: "chat-modal", // Now handled by React
  ENTER_NAME: "enter-name-modal",
  CONFIRM: "confirm-modal",
  READABLE: "readable-modal",
  OFFER: "offer-modal",
  MAP: "map-modal",
  SPELLBOOK: "spellbook-modal",

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
    // All modals now handled by React UI system
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
    // Modal triggers handled by React event system
  }

  private addTopbarListeners(): void {
    // Topbar interactions handled by React components
  }

  private addModalHeaderListeners(): void {
    // Modal header interactions handled by React components
  }

  private handleHeaderMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  public open(id: string, options?: ModalOptions): Modal | null {
    // Bridge to React UI system
    if ((window as any).reactUIManager) {
      console.log(`🔄 Redirecting modal "${id}" to React UI system`);
      
      // Map old modal IDs to React modal names
      const modalMapping: { [key: string]: string } = {
        [MODAL_IDS.SETTINGS]: 'settings',
        [MODAL_IDS.SKILL]: 'skills',
        [MODAL_IDS.OUTFIT]: 'outfit',
        [MODAL_IDS.MAP]: 'map',
        // [MODAL_IDS.CHAT]: 'chat', // Now handled by React
        [MODAL_IDS.MOVE_ITEM]: 'moveItem',
        [MODAL_IDS.CONFIRM]: 'confirm',
        [MODAL_IDS.ENTER_NAME]: 'enterName',
        [MODAL_IDS.READABLE]: 'readable',
        [MODAL_IDS.OFFER]: 'offer',
        [MODAL_IDS.SPELLBOOK]: 'spellbook'
      };

      const reactModalName = modalMapping[id];
      if (reactModalName) {
        (window as any).reactUIManager.openModal(reactModalName, options);
        return null; // Return null since React is handling it
      }
    }

    // Fallback to old system if React UI is not available
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
    // React components handle all modal interactions
    return null;
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
      // Login now handled by React components
      return;
    }

    this.close();
  }

  public render(): void {
    if (!this.isOpened()) return;
    this.openedModal!.handleRender();
  }

  private isAuthFormModal(): boolean {
    // Auth forms now handled by React components
    return false;
  }
}

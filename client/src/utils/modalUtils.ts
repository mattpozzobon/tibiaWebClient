/**
 * Utility functions for modal management
 */

interface ReactUIManager {
  isAnyModalOpen: () => boolean;
  closeAllModals: () => void;
  closeModal: (modalName: string) => void;
  openModal: (modalName: string, data?: any) => void;
}

function getUIManager(): ReactUIManager | null {
  const uiManager = (window as any).reactUIManager;
  if (uiManager && typeof uiManager.isAnyModalOpen === 'function') {
    return uiManager as ReactUIManager;
  }
  return null;
}

export function isAnyModalOpen(): boolean {
  const uiManager = getUIManager();
  return uiManager ? uiManager.isAnyModalOpen() : false;
}

export function closeAllModals(): void {
  const uiManager = getUIManager();
  if (uiManager && typeof uiManager.closeAllModals === 'function') {
    uiManager.closeAllModals();
  }
}

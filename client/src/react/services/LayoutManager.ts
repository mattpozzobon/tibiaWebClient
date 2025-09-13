import React from 'react';

export interface GameWindow {
  id: string;
  component: React.ReactNode;
  position: 'left' | 'right';
  visible: boolean;
}

export interface Modal {
  id: string;
  component: React.ReactNode;
  visible: boolean;
}

export interface LayoutManagerState {
  gameWindows: GameWindow[];
  modals: Modal[];
}

export class LayoutManager {
  private state: LayoutManagerState = {
    gameWindows: [],
    modals: []
  };

  private listeners: Set<(state: LayoutManagerState) => void> = new Set();

  // Game Window Management
  public addGameWindow(id: string, component: React.ReactNode, position: 'left' | 'right'): void {
    this.state.gameWindows = this.state.gameWindows.filter(w => w.id !== id);
    this.state.gameWindows.push({ id, component, position, visible: true });
    this.notifyListeners();
  }

  public removeGameWindow(id: string): void {
    this.state.gameWindows = this.state.gameWindows.map(w => 
      w.id === id ? { ...w, visible: false } : w
    );
    this.notifyListeners();
  }

  public toggleGameWindow(id: string): void {
    this.state.gameWindows = this.state.gameWindows.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    this.notifyListeners();
  }

  // Modal Management
  public openModal(id: string, component: React.ReactNode): void {
    this.state.modals = this.state.modals.filter(m => m.id !== id);
    this.state.modals.push({ id, component, visible: true });
    this.notifyListeners();
  }

  public closeModal(id: string): void {
    this.state.modals = this.state.modals.map(m => 
      m.id === id ? { ...m, visible: false } : m
    );
    this.notifyListeners();
  }

  public closeAllModals(): void {
    this.state.modals = this.state.modals.map(m => ({ ...m, visible: false }));
    this.notifyListeners();
  }

  public closeLastModal(): void {
    if (this.state.modals.length > 0) {
      const lastModal = this.state.modals[this.state.modals.length - 1];
      this.closeModal(lastModal.id);
    }
  }

  // State Management
  public getState(): LayoutManagerState {
    return { ...this.state };
  }

  public subscribe(listener: (state: LayoutManagerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

// Global instance
export const layoutManager = new LayoutManager();

/**
 * ReactNotificationManager - Simplified React-based notification system
 * 
 * This replaces the old DOM-based NotificationManager with a clean React state system
 */

import Interface from '../../ui/interface';

class ReactNotificationManager {
  private notificationCallbacks: Set<(notification: any) => void> = new Set();

  constructor() {
    // Initialize the manager
  }

  // Event System
  public onNotification(callback: (notification: any) => void): () => void {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  private notifyCallbacks(notification: any): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  // Simplified API - just like reactChannelManager.addConsoleMessage()
  public addServerMessage(message: string, color: number = Interface.COLORS.WHITE): void {
    const hexColor = Interface.prototype.getHexColor(color);
    this.notifyCallbacks({
      type: 'server',
      message,
      color: hexColor,
      timestamp: Date.now()
    });
  }

  public addZoneMessage(message: string, title: string = ''): void {
    this.notifyCallbacks({
      type: 'zone',
      message,
      title,
      timestamp: Date.now()
    });
  }

  public addCancelMessage(message: string): void {
    this.notifyCallbacks({
      type: 'cancel',
      message,
      timestamp: Date.now()
    });
  }

  // Convenience methods with common colors
  public addSuccessMessage(message: string): void {
    this.addServerMessage(message, Interface.COLORS.LIGHTGREEN);
  }

  public addErrorMessage(message: string): void {
    this.addServerMessage(message, Interface.COLORS.RED);
  }

  public addWarningMessage(message: string): void {
    this.addServerMessage(message, Interface.COLORS.ORANGE);
  }

  public addInfoMessage(message: string): void {
    this.addServerMessage(message, Interface.COLORS.LIGHTBLUE);
  }

  // Legacy compatibility - redirects to new methods
  public setServerMessage(message: string, color: number): void {
    this.addServerMessage(message, color);
  }

  public setZoneMessage(message: string, title: string): void {
    this.addZoneMessage(message, title);
  }

  public setCancelMessage(message: string): void {
    this.addCancelMessage(message);
  }
}

// Export singleton instance
export const reactNotificationManager = new ReactNotificationManager();

// Expose globally for easy access
(window as any).reactNotificationManager = reactNotificationManager;

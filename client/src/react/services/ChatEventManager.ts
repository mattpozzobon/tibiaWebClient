/**
 * ChatEventManager - Centralized event handling for chat system
 * 
 * This service provides a clean separation between the game's packet handling
 * and the React chat system, using custom events for communication.
 */

import { reactChannelManager, Channel } from './ReactChannelManager';

export interface ChatMessageData {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  color: string;
  type: number;
  channelName: string;
}

export interface CreatureSpeechEvent {
  creatureId: number;
  creatureName: string;
  message: string;
  type: number;
  color: number;
  channelId: number;
}

class ChatEventManager {
  private messageCallbacks: Set<(message: ChatMessageData) => void> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for creature speech events from packet-handler
    window.addEventListener('creature-speech', (event: Event) => {
      const customEvent = event as CustomEvent<CreatureSpeechEvent>;
      this.handleCreatureSpeech(customEvent.detail);
    });

    // Listen for channel messages (we'll add these events later)
    window.addEventListener('channel-message', (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      this.handleChannelMessage(customEvent.detail);
    });

    window.addEventListener('private-message', (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      this.handlePrivateMessage(customEvent.detail);
    });

    window.addEventListener('console-message', (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      this.handleConsoleMessage(customEvent.detail);
    });
  }

  private handleCreatureSpeech(data: CreatureSpeechEvent): void {
    
    const messageData: ChatMessageData = {
      id: `creature-${data.creatureId}-${data.message}-${Date.now()}`,
      text: data.message,
      sender: data.creatureName,
      timestamp: new Date(),
      color: this.convertColorToHex(data.color),
      type: data.type,
      channelName: 'Default' // Creature speech goes to Default channel
    };

    this.notifyMessageCallbacks(messageData);
  }

  private handleChannelMessage(data: any): void {
    // Map channel ID to channel name
    const channelNames = {
      0: 'Default',
      1: 'World', 
      2: 'Trade',
      3: 'Help'
    };
    
    const channelName = channelNames[data.channelId as keyof typeof channelNames] || 'Default';
    
    const messageData: ChatMessageData = {
      id: `channel-${data.channelId}-${data.name}-${data.message}-${Date.now()}`,
      text: data.message,
      sender: data.name,
      timestamp: new Date(),
      color: this.convertColorToHex(data.color),
      type: 0,
      channelName: channelName
    };

    this.notifyMessageCallbacks(messageData);
  }

  private handlePrivateMessage(data: any): void {
    const messageData: ChatMessageData = {
      id: `private-${data.name}-${data.message}-${Date.now()}`,
      text: data.message,
      sender: data.name,
      timestamp: new Date(),
      color: '#ffffff',
      type: 1,
      channelName: data.channelName || 'Private'
    };

    this.notifyMessageCallbacks(messageData);
  }

  private handleConsoleMessage(data: any): void {
    const messageData: ChatMessageData = {
      id: `console-${data.message}-${Date.now()}`,
      text: data.message,
      sender: 'System',
      timestamp: new Date(),
      color: this.convertColorToHex(data.color),
      type: 0,
      channelName: 'Console' // Console messages go to Console channel
    };

    this.notifyMessageCallbacks(messageData);
  }

  private convertColorToHex(color: number): string {
    // Use game's color conversion if available
    if (window.gameClient?.interface?.getHexColor) {
      return window.gameClient.interface.getHexColor(color);
    }
    // Fallback to manual conversion
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private notifyMessageCallbacks(message: ChatMessageData): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in chat message callback:', error);
      }
    });
  }

  /**
   * Register a callback to receive chat messages
   */
  public onMessage(callback: (message: ChatMessageData) => void): () => void {
    this.messageCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * Dispatch a custom chat event (for testing or other systems)
   */
  public dispatchCreatureSpeech(data: CreatureSpeechEvent): void {
    const event = new CustomEvent('creature-speech', { detail: data });
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const chatEventManager = new ChatEventManager();

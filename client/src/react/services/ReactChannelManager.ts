/**
 * ReactChannelManager - React-based channel and loudness management
 * 
 * This replaces the old DOM-based ChannelManager with a clean React state system
 */

export interface Channel {
  id: number | null;
  name: string;
  type: 'regular' | 'private' | 'local';
  messages: any[];
}

class ReactChannelManager {
  private channels: Channel[] = [];
  private activeChannelIndex: number = 0;
  private joinedChannels: Set<number> = new Set();
  private channelChangeCallbacks: Set<(channel: Channel) => void> = new Set();

  constructor() {
    this.initializeDefaultChannels();
    // Join Default channel by default
    this.joinedChannels.add(0);
  }

  private initializeDefaultChannels(): void {
    // Create channels matching the server's channel system
    this.channels = [
      { id: 0, name: 'Default', type: 'regular', messages: [] },
      { id: 1, name: 'World', type: 'regular', messages: [] },
      { id: 2, name: 'Trade', type: 'regular', messages: [] },
      { id: 3, name: 'Help', type: 'regular', messages: [] },
      { id: null, name: 'Console', type: 'local', messages: [] }
    ];
  }

  // Channel Management
  public getChannels(): Channel[] {
    return [...this.channels];
  }

  public getActiveChannel(): Channel {
    return this.channels[this.activeChannelIndex] || this.channels[0];
  }

  public setActiveChannel(index: number): void {
    if (index >= 0 && index < this.channels.length) {
      this.activeChannelIndex = index;
      this.notifyChannelChange();
    }
  }

  public addChannel(id: number | null, name: string, type: 'regular' | 'private' = 'regular'): void {
    const newChannel: Channel = { id, name, type, messages: [] };
    this.channels.push(newChannel);
    this.notifyChannelChange();
  }

  public addPrivateChannel(name: string): void {
    this.addChannel(null, name, 'private');
  }

  public removeChannel(name: string): boolean {
    const index = this.channels.findIndex(ch => ch.name === name);
    if (index !== -1 && index !== 0) { // Don't remove Default channel
      this.channels.splice(index, 1);
      if (this.activeChannelIndex >= index) {
        this.activeChannelIndex = Math.max(0, this.activeChannelIndex - 1);
      }
      this.notifyChannelChange();
      return true;
    }
    return false;
  }

  public getChannelById(id: number): Channel | null {
    return this.channels.find(ch => ch.id === id) || null;
  }

  public getChannel(name: string): Channel | null {
    return this.channels.find(ch => ch.name === name) || null;
  }

  // Channel joining and leaving
  public joinChannel(channelId: number): void {
    if (!this.joinedChannels.has(channelId)) {
      this.joinedChannels.add(channelId);
      // Send join packet to server
      if (window.gameClient) {
        const { ChannelJoinPacket } = require('../../core/protocol');
        window.gameClient.send(new ChannelJoinPacket(channelId));
      }
      console.log(`Joining channel ${channelId}`);
    }
  }

  public leaveChannel(channelId: number): void {
    if (this.joinedChannels.has(channelId)) {
      this.joinedChannels.delete(channelId);
      // Send leave packet to server
      if (window.gameClient) {
        const { ChannelLeavePacket } = require('../../core/protocol');
        window.gameClient.send(new ChannelLeavePacket(channelId));
      }
      console.log(`Leaving channel ${channelId}`);
    }
  }

  public isJoinedToChannel(channelId: number): boolean {
    return this.joinedChannels.has(channelId);
  }

  public getJoinedChannels(): number[] {
    return Array.from(this.joinedChannels);
  }

  // Loudness removed - all messages use say (loudness 1)

  // Event System
  public onChannelChange(callback: (channel: Channel) => void): () => void {
    this.channelChangeCallbacks.add(callback);
    return () => this.channelChangeCallbacks.delete(callback);
  }

  private notifyChannelChange(): void {
    const activeChannel = this.getActiveChannel();
    this.channelChangeCallbacks.forEach(callback => {
      try {
        callback(activeChannel);
      } catch (error) {
        console.error('Error in channel change callback:', error);
      }
    });
  }

  // Compatibility methods for gradual migration
  public handleChannelIncrement(direction: number): void {
    const newIndex = this.activeChannelIndex + direction;
    if (newIndex >= 0 && newIndex < this.channels.length) {
      this.setActiveChannel(newIndex);
    }
  }

  public suggestPrevious(): void {
    // This would integrate with message history in the future
    console.log('Suggest previous message - to be implemented');
  }

  public closeCurrentChannel(): boolean {
    const activeChannel = this.getActiveChannel();
    if (activeChannel.type !== 'regular' || activeChannel.name === 'Default') {
      return false; // Can't close default or regular channels
    }
    return this.removeChannel(activeChannel.name);
  }

  // Message handling (for compatibility)
  public addConsoleMessage(message: string, color: number): void {
    const consoleChannel = this.getChannel('Console');
    if (consoleChannel) {
      // Dispatch event for React chat to handle
      const event = new CustomEvent('console-message', {
        detail: { message, color, channelName: 'Console' }
      });
      window.dispatchEvent(event);
    }
  }
}

// Export singleton instance
export const reactChannelManager = new ReactChannelManager();

// Expose globally for keyboard integration
(window as any).reactChannelManager = reactChannelManager;

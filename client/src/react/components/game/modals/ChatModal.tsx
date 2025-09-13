import React, { useState, useEffect } from 'react';
import type GameClient from '../../../../core/gameclient';
import './styles/ChatModal.scss';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

interface ChannelOption {
  id: string;
  name: string;
  type: 'global' | 'local';
  channelId?: number;
}

export default function ChatModal({ isOpen, onClose, gc }: ChatModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [privateChannelName, setPrivateChannelName] = useState('');
  const [availableChannels, setAvailableChannels] = useState<ChannelOption[]>([
    { id: 'world', name: 'World', type: 'global', channelId: 1 },
    { id: 'trade', name: 'Trade', type: 'global', channelId: 2 },
    { id: 'help', name: 'Help', type: 'global', channelId: 3 },
    { id: 'console', name: 'Console', type: 'local' }
  ]);

  useEffect(() => {
    if (isOpen && gc && gc.interface && gc.interface.channelManager) {
      // Load existing channels from the channel manager
      const channelManager = gc.interface.channelManager;
      const existingChannels = channelManager.channels.map((channel: any) => ({
        id: channel.name.toLowerCase(),
        name: channel.name,
        type: (channel.id === null ? 'local' : 'global') as 'global' | 'local',
        channelId: channel.id
      }));
      setAvailableChannels(existingChannels);
    }
  }, [isOpen, gc]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    setPrivateChannelName(''); // Clear private channel input
  };

  const handlePrivateChannelFocus = () => {
    setSelectedChannel(''); // Clear channel selection
  };

  const handleConfirm = () => {
    if (selectedChannel) {
      // Join a selected channel
      const channel = availableChannels.find(c => c.id === selectedChannel);
      if (channel) {
        if (channel.type === 'local') {
          // Add local channel
          if (gc && gc.interface && gc.interface.channelManager) {
            gc.interface.channelManager.addLocalChannel(channel.name);
          }
        } else {
          // Join global channel
          if (gc && gc.interface && gc.interface.channelManager && channel.channelId) {
            gc.interface.channelManager.joinChannel(channel.channelId, channel.name);
          }
        }
      }
    } else if (privateChannelName.trim()) {
      // Open private channel
      if (gc && gc.interface && gc.interface.channelManager) {
        gc.interface.channelManager.addPrivateChannel(privateChannelName.trim());
      }
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chat Options</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="channel-section">
            <h3>Select a channel:</h3>
            <div className="channel-list">
              {availableChannels.map((channel) => (
                <div
                  key={channel.id}
                  className={`channel-option ${selectedChannel === channel.id ? 'selected' : ''}`}
                  onClick={() => handleChannelSelect(channel.id)}
                >
                  <span className="channel-name">{channel.name}</span>
                  <span className="channel-type">({channel.type})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="divider">
            <hr />
            <span>OR</span>
            <hr />
          </div>

          <div className="private-section">
            <h3>Open a private channel:</h3>
            <input
              type="text"
              value={privateChannelName}
              onChange={(e) => setPrivateChannelName(e.target.value)}
              onFocus={handlePrivateChannelFocus}
              onKeyDown={handleKeyPress}
              placeholder="Enter player name..."
              className="private-channel-input"
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={!selectedChannel && !privateChannelName.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

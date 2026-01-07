import React, { useState, useEffect } from 'react';
import type GameClient from '../../../../core/gameclient';
import { reactChannelManager } from '../../../services/ReactChannelManager';
import BaseModal from '../../shared/BaseModal';
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
    if (isOpen) {
      // Load existing channels from ReactChannelManager
      const existingChannels = reactChannelManager.getChannels().map((channel: any) => ({
        id: channel.name.toLowerCase(),
        name: channel.name,
        type: (channel.id === null ? 'local' : 'global') as 'global' | 'local',
        channelId: channel.id
      }));
      setAvailableChannels(existingChannels);
    }
  }, [isOpen]);

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
          reactChannelManager.addChannel(null, channel.name, 'regular');
        } else {
          // Join global channel (World, Trade, Help)
          // These channels already exist in the default channels, so just join them
          if (channel.channelId !== undefined) {
            reactChannelManager.joinChannel(channel.channelId);
            // Switch to the joined channel
            const allChannels = reactChannelManager.getChannels();
            const channelIndex = allChannels.findIndex(c => c.id === channel.channelId);
            if (channelIndex !== -1) {
              reactChannelManager.setActiveChannel(channelIndex);
            }
          }
        }
      }
    } else if (privateChannelName.trim()) {
      // Open private channel
      reactChannelManager.addPrivateChannel(privateChannelName.trim());
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const footer = (
    <>
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
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Chat Options"
      footer={footer}
      size="medium"
    >
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
    </BaseModal>
  );
}

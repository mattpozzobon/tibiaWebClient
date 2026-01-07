import { useState, useEffect } from 'react';
import { reactChannelManager, Channel } from '../../../../../services/ReactChannelManager';

export function useChatChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  useEffect(() => {
    // Initialize with React channel manager
    const initialChannels = reactChannelManager.getChannels();
    setChannels(initialChannels);
    setActiveChannel(reactChannelManager.getActiveChannel());

    // Subscribe to channel changes
    const unsubscribeChannel = reactChannelManager.onChannelChange((channel: Channel) => {
      setActiveChannel(channel);
      // Also update the channels array when it changes
      setChannels(reactChannelManager.getChannels());
    });

    return () => {
      unsubscribeChannel();
    };
  }, []);

  const handleChannelChange = (channel: Channel) => {
    // Join the channel if not already joined (except for Console and private channels)
    if (channel.type !== 'local' && channel.type !== 'private' && channel.id !== null) {
      reactChannelManager.joinChannel(channel.id);
    }
    
    // Clear unread count for private channels when switching to them
    if (channel.type === 'private') {
      reactChannelManager.clearUnreadCount(channel.name);
    }
    
    // Set as active channel - use manager's channels array to find the correct index
    const managerChannels = reactChannelManager.getChannels();
    const channelIndex = managerChannels.findIndex(c => {
      if (channel.type === 'private') {
        return c.name === channel.name && c.type === 'private';
      } else {
        return c.id === channel.id && c.name === channel.name;
      }
    });
    
    if (channelIndex !== -1) {
      reactChannelManager.setActiveChannel(channelIndex);
    }
  };

  const handleChannelClose = (channel: Channel) => {
    if (channel.type === 'private') {
      reactChannelManager.removePrivateChannel(channel.name);
    } else if (channel.id !== null) {
      reactChannelManager.leaveChannel(channel.id);
      // If this was the active channel, switch to Default
      if (activeChannel?.id === channel.id) {
        const allChannels = reactChannelManager.getChannels();
        const defaultIndex = allChannels.findIndex(c => c.name === 'Default');
        if (defaultIndex !== -1) {
          reactChannelManager.setActiveChannel(defaultIndex);
        }
      }
    }
  };

  return {
    channels,
    activeChannel,
    handleChannelChange,
    handleChannelClose
  };
}

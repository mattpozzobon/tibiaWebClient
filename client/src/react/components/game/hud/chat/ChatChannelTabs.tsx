import React from 'react';
import { Channel } from '../../../../services/ReactChannelManager';
import { reactChannelManager } from '../../../../services/ReactChannelManager';
import ChatChannelTab from './ChatChannelTab';

interface ChatChannelTabsProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onChannelChange: (channel: Channel) => void;
  onChannelClose: (channel: Channel) => void;
}

export default function ChatChannelTabs({ 
  channels, 
  activeChannel, 
  onChannelChange, 
  onChannelClose 
}: ChatChannelTabsProps) {
  const visibleChannels = channels.filter(ch => {
    // Always show local channels (filtered out)
    if (ch.type === 'local') return false;
    // Always show Default channel
    if (ch.name === 'Default') return true;
    // Always show private channels
    if (ch.type === 'private') return true;
    // Only show World, Trade, Help if they are joined
    if (ch.id !== null && reactChannelManager.isJoinedToChannel(ch.id)) return true;
    // Don't show unjoined World, Trade, Help channels
    return false;
  });

  return (
    <div className="chat-channel-tabs">
      {visibleChannels.map((channel) => (
        <ChatChannelTab
          key={channel.id || channel.name}
          channel={channel}
          isActive={activeChannel?.id === channel.id && activeChannel?.name === channel.name}
          onChannelChange={onChannelChange}
          onChannelClose={onChannelClose}
        />
      ))}
    </div>
  );
}

import React from 'react';
import { Channel } from '../../../../services/ReactChannelManager';

interface ChatCollapsedProps {
  channels: Channel[];
  onExpand: () => void;
}

export default function ChatCollapsed({ channels, onExpand }: ChatCollapsedProps) {
  const hasUnreadMessages = channels.some(
    ch => ch.type === 'private' && ch.unreadCount && ch.unreadCount > 0
  );

  return (
    <div className="chat-collapsed" onClick={onExpand} title="Click to open chat">
      <div className="chat-icon">💬</div>
      {hasUnreadMessages && <div className="chat-notification-dot"></div>}
    </div>
  );
}

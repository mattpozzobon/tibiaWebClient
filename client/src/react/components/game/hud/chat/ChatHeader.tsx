import React from 'react';
import { Channel } from '../../../../services/ReactChannelManager';
import ChatChannelTabs from './ChatChannelTabs';

interface ChatHeaderProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onChannelChange: (channel: Channel) => void;
  onChannelClose: (channel: Channel) => void;
  onOpenChatModal: () => void;
  onCollapseChat: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export default function ChatHeader({
  channels,
  activeChannel,
  onChannelChange,
  onChannelClose,
  onOpenChatModal,
  onCollapseChat,
  onDragStart
}: ChatHeaderProps) {
  return (
    <div className="chat-header" onMouseDown={onDragStart}>
      <ChatChannelTabs channels={channels} activeChannel={activeChannel} onChannelChange={onChannelChange} onChannelClose={onChannelClose} />
      <div className="chat-controls">
        <button className="chat-control-btn" onClick={onOpenChatModal} title="Open Chat Options">💬</button>
        <button className="chat-control-btn chat-collapse-btn" onClick={onCollapseChat} title="Collapse chat"></button>
      </div>
    </div>
  );
}

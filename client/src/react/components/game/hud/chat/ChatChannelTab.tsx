import React from 'react';
import { Channel } from '../../../../services/ReactChannelManager';
import { reactChannelManager } from '../../../../services/ReactChannelManager';

interface ChatChannelTabProps {
  channel: Channel;
  isActive: boolean;
  onChannelChange: (channel: Channel) => void;
  onChannelClose: (channel: Channel) => void;
}

export default function ChatChannelTab({ 
  channel, 
  isActive, 
  onChannelChange, 
  onChannelClose 
}: ChatChannelTabProps) {
  const isJoined = channel.id !== null && reactChannelManager.isJoinedToChannel(channel.id);
  const isPrivate = channel.type === 'private';
  const canClose = channel.name !== 'Default';

  const getTabClassName = () => {
    let className = 'channel-tab';
    if (isActive) className += ' active';
    if (isPrivate) className += ' private';
    else if (isJoined) className += ' joined';
    else className += ' not-joined';
    return className;
  };

  const getTitle = () => {
    const typeText = isPrivate ? '(private)' : (isJoined ? '(joined)' : '(not joined)');
    return `Switch to ${channel.name} channel ${typeText}`;
  };

  return (
    <div className="channel-tab-wrapper">
      <button
        className={getTabClassName()}
        onClick={() => onChannelChange(channel)}
        title={getTitle()}
      >
        {channel.name}
        {isPrivate && channel.unreadCount && channel.unreadCount > 0 && (
          <span className="unread-count">{channel.unreadCount}</span>
        )}
      </button>
      {canClose && (
        <button
          className="channel-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onChannelClose(channel);
          }}
          title={`Close ${channel.name} channel`}
        >
          ×
        </button>
      )}
    </div>
  );
}

import React from 'react';

export interface ChatMessage {
  id: string;
  text: string;
  sender?: string;
  timestamp: Date;
  color?: string;
  type?: number;
  channelName?: string;
}

interface ChatMessageProps {
  message: ChatMessage;
  onSenderRightClick?: (e: React.MouseEvent, senderName: string) => void;
}

export default function ChatMessageComponent({ message, onSenderRightClick }: ChatMessageProps) {
  const handleContextMenu = (e: React.MouseEvent) => {
    if (message.sender && message.sender !== 'You' && onSenderRightClick) {
      e.preventDefault();
      e.stopPropagation();
      onSenderRightClick(e, message.sender);
    }
  };

  return (
    <div className="message">
      <span className="message-time">
        {message.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        })}
      </span>
      {message.sender && (
        <span 
          className="message-sender" 
          style={{ color: message.color }}
          onContextMenu={handleContextMenu}
        >
          {message.sender === 'You' ? '👤' : ''} {message.sender}:
        </span>
      )}
      <span className="message-text">{message.text}</span>
    </div>
  );
}

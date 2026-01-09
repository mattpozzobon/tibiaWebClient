import React from 'react';
import ChatMessageComponent, { ChatMessage } from './ChatMessage';

interface ChatMessageListProps {
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSenderRightClick?: (e: React.MouseEvent, senderName: string) => void;
}

export default function ChatMessageList({ messages, messagesEndRef, onSenderRightClick }: ChatMessageListProps) {
  return (
    <div className="chat-messages">
      {messages.map((message, index) => (
        <ChatMessageComponent 
          key={message.id || index} 
          message={message} 
          onSenderRightClick={onSenderRightClick}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

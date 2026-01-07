import React from 'react';
import ChatMessageComponent, { ChatMessage } from './ChatMessage';

interface ChatMessageListProps {
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessageList({ messages, messagesEndRef }: ChatMessageListProps) {
  return (
    <div className="chat-messages">
      {messages.map((message, index) => (
        <ChatMessageComponent key={message.id || index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

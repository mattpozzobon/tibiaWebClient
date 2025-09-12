import React, { useState, useRef, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';

interface ChatWindowProps {
  gc: GameClient;
}

interface ChatMessage {
  id: string;
  text: string;
  type: 'system' | 'player' | 'global' | 'private';
  timestamp: Date;
  sender?: string;
}

export default function ChatWindow({ gc }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeChannel, setActiveChannel] = useState<'global' | 'private' | 'system'>('global');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add the message to the chat
    addMessage({
      text: inputValue,
      type: activeChannel,
      sender: 'You'
    });

    // TODO: Send message to game server
    // gc.networkManager.sendChatMessage(inputValue, activeChannel);
    
    setInputValue('');
  };

  const handleChannelChange = (channel: 'global' | 'private' | 'system') => {
    setActiveChannel(channel);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="channel-tabs">
          <button 
            className={`channel-tab ${activeChannel === 'global' ? 'active' : ''}`}
            onClick={() => handleChannelChange('global')}
          >
            Global
          </button>
          <button 
            className={`channel-tab ${activeChannel === 'private' ? 'active' : ''}`}
            onClick={() => handleChannelChange('private')}
          >
            Private
          </button>
          <button 
            className={`channel-tab ${activeChannel === 'system' ? 'active' : ''}`}
            onClick={() => handleChannelChange('system')}
          >
            System
          </button>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <span className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </span>
            {message.sender && (
              <span className="message-sender">{message.sender}:</span>
            )}
            <span className="message-text">{message.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Type a ${activeChannel} message...`}
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn">Send</button>
      </form>
    </div>
  );
}

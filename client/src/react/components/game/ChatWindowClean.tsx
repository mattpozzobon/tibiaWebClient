import React, { useState, useRef, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
import { ChannelMessagePacket, ChannelPrivatePacket } from '../../../core/protocol';
import { chatEventManager, ChatMessageData } from '../../services/ChatEventManager';
import { reactChannelManager, Channel } from '../../services/ReactChannelManager';
import './styles/ChatWindow.scss';

// Ensure services are initialized
chatEventManager;

interface ChatWindowProps {
  gc: GameClient;
}

interface ChatMessage {
  id: string;
  text: string;
  sender?: string;
  timestamp: Date;
  color?: string;
  type?: number;
  channelName?: string;
}

export default function ChatWindow({ gc }: ChatWindowProps) {
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [consoleMessages, setConsoleMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isActive, setIsActive] = useState(false); // Chat input active state
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const consoleMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Method to handle Enter key from keyboard system
  const handleEnterKey = () => {
    if (!isActive) {
      // First Enter press - activate chat
      setIsActive(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      // Second Enter press - send message if not empty and deactivate
      const message = inputValue.trim();
      if (message && activeChannel) {
        // Check if it's a LocalChannel (Console) - cannot send to local channels
        if (activeChannel.type === 'local') {
          gc.interface.setCancelMessage("Cannot write to a local channel.");
          return;
        }
        
        // Send message based on channel type
        if (activeChannel.type === 'private') {
          // Private channel - send private packet
          gc.send(new ChannelPrivatePacket(activeChannel.name, message));
        } else if (activeChannel.id !== null) {
          // Regular channel - send with say (loudness 1)
          gc.send(new ChannelMessagePacket(activeChannel.id, 1, message));
        }
        
        // Note: Message will be added through the event system when the server responds
      }
      
      // Clear input and blur (but keep chat window visible)
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  // Expose the handleEnterKey method to the global scope
  useEffect(() => {
    (window as any).reactChatWindow = {
      handleEnterKey
    };

    return () => {
      delete (window as any).reactChatWindow;
    };
  }, [isActive, inputValue]);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>, section: string) => {
    if (ref.current) {
      // Find the parent chat-messages container
      const messagesContainer = ref.current.closest('.chat-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom(chatMessagesEndRef, 'chat');
  }, [allMessages, activeChannel]);

  useEffect(() => {
    scrollToBottom(consoleMessagesEndRef, 'console');
  }, [consoleMessages]);

  useEffect(() => {
    // Initialize with React channel manager
    const initialChannels = reactChannelManager.getChannels();
    setChannels(initialChannels);
    setActiveChannel(reactChannelManager.getActiveChannel());

    // Subscribe to channel changes
    const unsubscribeChannel = reactChannelManager.onChannelChange((channel: Channel) => {
      setActiveChannel(channel);
    });

    // Loudness system removed - all messages use say

    // Subscribe to chat events from ChatEventManager
    const unsubscribeMessages = chatEventManager.onMessage((messageData: ChatMessageData) => {

      // Convert ChatMessageData to ChatMessage format
      const chatMessage: ChatMessage = {
        id: messageData.id,
        text: messageData.text,
        sender: messageData.sender,
        timestamp: messageData.timestamp,
        color: messageData.color,
        type: messageData.type,
        channelName: messageData.channelName
      };
      
      // Route messages to appropriate channel based on channelName
      if (messageData.channelName === 'Console') {
        setConsoleMessages(prev => {
          const exists = prev.some(msg => msg.id === chatMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev.slice(-49), chatMessage]; // Keep last 50 console messages
        });
      } else {
        // Add to all messages for channel filtering
        setAllMessages(prev => {
          const exists = prev.some(msg => msg.id === chatMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev.slice(-199), chatMessage]; // Keep last 200 messages total
        });
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeChannel();
      unsubscribeMessages();
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle form submission (from Send button)
    const message = inputValue.trim();
    if (message && activeChannel) {
      // Check if it's a LocalChannel (Console) - cannot send to local channels
      if (activeChannel.type === 'local') {
        gc.interface.setCancelMessage("Cannot write to a local channel.");
        return;
      }
      
      // Send message based on channel type
      if (activeChannel.type === 'private') {
        // Private channel - send private packet
        gc.send(new ChannelPrivatePacket(activeChannel.name, message));
      } else if (activeChannel.id !== null) {
        // Regular channel - send with say (loudness 1)
        gc.send(new ChannelMessagePacket(activeChannel.id, 1, message));
      }
      
      // Note: Message will be added through the event system when the server responds
      
      // Clear input and blur (but keep chat window visible)
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  const handleChannelChange = (channel: Channel) => {
    // Join the channel if not already joined (except for Console)
    if (channel.type !== 'local' && channel.id !== null) {
      reactChannelManager.joinChannel(channel.id);
    }
    
    // Set as active channel
    reactChannelManager.setActiveChannel(channels.findIndex(c => c.id === channel.id));
  };

  // Filter messages by active channel
  const getFilteredMessages = () => {
    if (!activeChannel) return [];
    return allMessages.filter(msg => msg.channelName === activeChannel.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsActive(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp' && e.shiftKey) {
      // Handle channel suggestion
      reactChannelManager.suggestPrevious();
    }
  };

  const handleFocus = () => {
    if (!isActive) {
      setIsActive(true);
    }
  };

  const handleBlur = () => {
    // Let Enter/Escape control deactivation
  };

  // Loudness system removed - all messages use say

  const openChatModal = () => {
    if ((window as any).reactUIManager) {
      (window as any).reactUIManager.openModal('chat');
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-channel-tabs">
          {channels.filter(ch => ch.type !== 'local').map((channel) => (
            <button
              key={channel.id}
              className={`channel-tab ${activeChannel?.id === channel.id ? 'active' : ''} ${reactChannelManager.isJoinedToChannel(channel.id!) ? 'joined' : 'not-joined'}`}
              onClick={() => handleChannelChange(channel)}
              title={`Switch to ${channel.name} channel ${reactChannelManager.isJoinedToChannel(channel.id!) ? '(joined)' : '(not joined)'}`}
            >
              {channel.name}
              {reactChannelManager.isJoinedToChannel(channel.id!) && <span className="joined-indicator">●</span>}
            </button>
          ))}
        </div>
        <div className="chat-controls">
          <button 
            className="chat-control-btn"
            onClick={openChatModal}
            title="Open Chat Options"
          >
            💬
          </button>
        </div>
      </div>
      
      <div className="chat-messages-container">
        <div className="chat-messages-section">
          <div className="chat-section-header">
            💬 {activeChannel?.name || 'Chat'}
          </div>
          <div className="chat-messages">
            {getFilteredMessages().map((message, index) => (
              <div key={message.id || index} className="message">
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {message.sender && (
                  <span className="message-sender" style={{ color: message.color }}>
                    {message.sender === 'You' ? '👤' : '💬'} {message.sender}:
                  </span>
                )}
                <span className="message-text">{message.text}</span>
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
          </div>
        </div>
        
        <div className="chat-messages-section">
          <div className="chat-section-header">🔧 Console</div>
          <div className="chat-messages">
            {consoleMessages.map((message, index) => (
              <div key={message.id || index} className="message">
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {message.sender && (
                  <span className="message-sender" style={{ color: message.color }}>
                    🔧 {message.sender}:
                  </span>
                )}
                <span className="message-text">{message.text}</span>
              </div>
            ))}
            <div ref={consoleMessagesEndRef} />
          </div>
        </div>
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isActive ? "Type a message..." : "Press Enter to chat"}
          className={`chat-input ${isActive ? 'active' : 'inactive'}`}
          disabled={!isActive}
        />
        <button 
          type="submit" 
          className="chat-send-btn"
          disabled={!inputValue.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
import { ChannelMessagePacket, ChannelPrivatePacket } from '../../../core/protocol';
import './styles/ChatWindow.scss';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeChannelIndex, setActiveChannelIndex] = useState(0);
  const [channels, setChannels] = useState<any[]>([]);
  const [loudness, setLoudness] = useState(1); // 0=whisper, 1=say, 2=yell
  const [isActive, setIsActive] = useState(false); // Chat input active state
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      if (message) {
        // Send the message
        if (gc && gc.interface && gc.interface.channelManager) {
          const channelManager = gc.interface.channelManager;
          const activeChannel = channelManager.getActiveChannel();
          
          if (activeChannel && activeChannel.id !== null) {
            // Send the message via network
            if (activeChannel.name && activeChannel.name !== 'Default' && activeChannel.name !== 'World' && activeChannel.name !== 'Trade' && activeChannel.name !== 'Help') {
              gc.send(new ChannelPrivatePacket(activeChannel.name, message));
            } else {
              gc.send(new ChannelMessagePacket(activeChannel.id, loudness, message));
            }
            
            // Manually add the sent message to React state
            const sentMessage: ChatMessage = {
              id: Date.now().toString(),
              text: message,
              sender: 'You',
              timestamp: new Date(),
              color: '#FFFFFF',
              type: 1,
              channelName: activeChannel.name || 'Default'
            };
            setMessages(prev => [...prev, sentMessage]);
          }
        }
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
  }, [isActive, inputValue, loudness]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with game client's channel manager
    if (gc && gc.interface && gc.interface.channelManager) {
      const channelManager = gc.interface.channelManager;
      
      // Set up channels from the channel manager
      setChannels([...channelManager.channels]);
      setActiveChannelIndex(0); // Start with first channel
      
      // Listen for channel changes using public API
      const originalSetActiveChannel = (channelManager as any).setActiveChannel;
      if (originalSetActiveChannel) {
        (channelManager as any).setActiveChannel = function(index: number) {
          const result = originalSetActiveChannel.call(this, index);
          setActiveChannelIndex(index);
          return result;
        };
      }
      
      // Listen for new messages by intercepting the channel's addMessage method
      channelManager.channels.forEach((channel: any) => {
        // Intercept the public addMessage method (called by PacketHandler)
        const originalAddMessage = channel.addMessage;
        channel.addMessage = function(message: string, type: number, name: string, color: number) {
          const result = originalAddMessage.call(this, message, type, name, color);
          
          console.log(`Channel ${channel.name}.addMessage called:`, { message, type, name, color });
          
          // Add message to React state (with duplicate prevention)
          const messageId = `${channel.name}-${name}-${message}-${Date.now()}`;
          const chatMessage: ChatMessage = {
            id: messageId,
            text: message,
            sender: name || 'Unknown',
            timestamp: new Date(),
            color: color ? `#${color.toString(16).padStart(6, '0')}` : '#ffffff',
            type: type,
            channelName: channel.name
          };
          
          setMessages(prev => {
            // Check if this exact message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === messageId);
            if (exists) {
              console.log('Duplicate message prevented:', messageId);
              return prev;
            }
            return [...prev.slice(-99), chatMessage]; // Keep last 100 messages
          });
          return result;
        };

        // Also intercept the private __addMessage method (backup)
        const originalPrivateAddMessage = channel.__addMessage;
        channel.__addMessage = function(message: any) {
          const result = originalPrivateAddMessage.call(this, message);
          
          console.log(`Channel ${channel.name}.__addMessage called:`, message);
          
          // Add message to React state (with duplicate prevention)
          const messageId = `${channel.name}-${message.name || message.sender || 'Unknown'}-${message.message || message.text || message}-${Date.now()}`;
          const chatMessage: ChatMessage = {
            id: messageId,
            text: message.message || message.text || message,
            sender: message.name || message.sender || 'Unknown',
            timestamp: new Date(),
            color: message.color || '#ffffff',
            type: message.type || 0,
            channelName: channel.name
          };
          
          setMessages(prev => {
            // Check if this exact message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === messageId);
            if (exists) {
              console.log('Duplicate message prevented (__addMessage):', messageId);
              return prev;
            }
            return [...prev.slice(-99), chatMessage]; // Keep last 100 messages
          });
          return result;
        };
      });

      // Also intercept the channel manager's addMessage method if it exists
      const originalChannelManagerAddMessage = (channelManager as any).addMessage;
      if (originalChannelManagerAddMessage) {
        (channelManager as any).addMessage = function(message: any, channelId?: any) {
          const result = originalChannelManagerAddMessage.call(this, message, channelId);
          
          console.log('ChannelManager.addMessage called:', message, channelId);
          
          // Add message to React state
          const chatMessage: ChatMessage = {
            id: Date.now().toString() + Math.random(),
            text: message.message || message.text || message,
            sender: message.name || message.sender || 'Unknown',
            timestamp: new Date(),
            color: message.color || '#ffffff',
            type: message.type || 0,
            channelName: channelId ? `Channel ${channelId}` : 'Unknown'
          };
          
          setMessages(prev => [...prev.slice(-99), chatMessage]);
          return result;
        };
      }

      // Also try to intercept any other message handling methods
      const originalHandleMessage = (channelManager as any).handleMessage;
      if (originalHandleMessage) {
        (channelManager as any).handleMessage = function(message: any) {
          const result = originalHandleMessage.call(this, message);
          
          console.log('ChannelManager.handleMessage called:', message);
          
          // Add message to React state
          const chatMessage: ChatMessage = {
            id: Date.now().toString() + Math.random(),
            text: message.message || message.text || message,
            sender: message.name || message.sender || 'Unknown',
            timestamp: new Date(),
            color: message.color || '#ffffff',
            type: message.type || 0,
            channelName: 'Unknown'
          };
          
          setMessages(prev => [...prev.slice(-99), chatMessage]);
          return result;
        };
      }
    }
  }, [gc]);


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle form submission (from Send button)
    const message = inputValue.trim();
    if (message) {
      // Send the message
      if (gc && gc.interface && gc.interface.channelManager) {
        const channelManager = gc.interface.channelManager;
        const activeChannel = channelManager.getActiveChannel();
        
        if (activeChannel && activeChannel.id !== null) {
          // Send the message via network
          if (activeChannel.name && activeChannel.name !== 'Default' && activeChannel.name !== 'World' && activeChannel.name !== 'Trade' && activeChannel.name !== 'Help') {
            gc.send(new ChannelPrivatePacket(activeChannel.name, message));
          } else {
            gc.send(new ChannelMessagePacket(activeChannel.id, loudness, message));
          }
          
          // Manually add the sent message to React state
          const sentMessage: ChatMessage = {
            id: Date.now().toString(),
            text: message,
            sender: 'You',
            timestamp: new Date(),
            color: '#FFFFFF',
            type: 1,
            channelName: activeChannel.name || 'Default'
          };
          setMessages(prev => [...prev, sentMessage]);
        }
      }
      
      // Clear input and blur (but keep chat window visible)
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  const handleChannelChange = (index: number) => {
    if (gc && gc.interface && gc.interface.channelManager) {
      const channelManager = gc.interface.channelManager;
      
      // Use the channel manager's public API
      if ((channelManager as any).setActiveChannel) {
        (channelManager as any).setActiveChannel(index);
      } else {
        // Fallback: simulate clicking the navigation buttons
        if (index > activeChannelIndex) {
          const rightBtn = document.getElementById('right-channel') as HTMLButtonElement;
          if (rightBtn) rightBtn.click();
        } else if (index < activeChannelIndex) {
          const leftBtn = document.getElementById('left-channel') as HTMLButtonElement;
          if (leftBtn) leftBtn.click();
        }
      }
      
      setActiveChannelIndex(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(e);
    } else if (e.key === 'Escape') {
      // Deactivate chat and blur input
      setIsActive(false);
      inputRef.current?.blur();
    } else if (e.shiftKey && e.key === 'ArrowUp') {
      // Message history - get previous message from channel manager
      if (gc && gc.interface && gc.interface.channelManager) {
        gc.interface.channelManager.suggestPrevious();
      }
    }
  };

  const handleFocus = () => {
    setIsActive(true);
  };

  const handleBlur = () => {
    // Let Enter/Escape control deactivation
  };

  const toggleLoudness = () => {
    setLoudness(prev => (prev + 1) % 3);
  };

  const getLoudnessText = () => {
    switch (loudness) {
      case 0: return 'whisper';
      case 1: return 'say';
      case 2: return 'yell';
      default: return 'say';
    }
  };

  const getActiveChannel = () => {
    return channels[activeChannelIndex] || channels[0];
  };

  const openChatModal = () => {
    // Open the React chat modal for joining channels
    if ((window as any).reactUIManager) {
      (window as any).reactUIManager.openModal('chat');
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-channel-nav">
          <button 
            className="channel-nav-btn"
            onClick={() => handleChannelChange(Math.max(0, activeChannelIndex - 1))}
            disabled={activeChannelIndex === 0}
            title="Previous Channel"
          >
            ←
          </button>
          <div className="current-channel">
            {getActiveChannel()?.name || 'Default'}
          </div>
          <button 
            className="channel-nav-btn"
            onClick={() => handleChannelChange(Math.min(channels.length - 1, activeChannelIndex + 1))}
            disabled={activeChannelIndex >= channels.length - 1}
            title="Next Channel"
          >
            →
          </button>
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
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={message.id || index} className="message">
            <span className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </span>
            {message.sender && (
              <span 
                className="message-sender"
                style={{ color: message.color || '#ffffff' }}
              >
                {message.sender}:
              </span>
            )}
            <span className="message-text">{message.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <button 
          type="button"
          className="loudness-btn"
          onClick={toggleLoudness}
          title={`Loudness: ${getLoudnessText()}`}
        >
          {loudness === 0 ? 'whisper' : loudness === 1 ? 'say' : 'yell'}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isActive ? "Type a message..." : "Press Enter to unlock"}
          className={`chat-input ${isActive ? 'active' : 'inactive'}`}
          disabled={!isActive}
        />
        <button type="submit" className="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}
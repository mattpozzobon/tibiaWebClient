import React, { useState, useRef, useEffect } from 'react';
import type GameClient from '../../../../core/gameclient';
import { ChannelMessagePacket, ChannelPrivatePacket } from '../../../../core/protocol';
import { chatEventManager, ChatMessageData } from '../../../services/ChatEventManager';
import { reactChannelManager, Channel } from '../../../services/ReactChannelManager';
import './styles/ChatWindow.scss';

// Ensure services are initialized
chatEventManager;

interface ChatProps {
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

export default function Chat({ gc }: ChatProps) {
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [consoleMessages, setConsoleMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isActive, setIsActive] = useState(false); // Chat input active state
  const [isCollapsed, setIsCollapsed] = useState(true); // Chat window collapsed state
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = localStorage.getItem('chatWidth');
    return saved ? parseInt(saved, 10) : 600;
  });
  const [chatHeight, setChatHeight] = useState(() => {
    const saved = localStorage.getItem('chatHeight');
    return saved ? parseInt(saved, 10) : 350;
  });
  const [chatLeft, setChatLeft] = useState(() => {
    const saved = localStorage.getItem('chatLeft');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [chatBottom, setChatBottom] = useState(() => {
    const saved = localStorage.getItem('chatBottom');
    return saved ? parseInt(saved, 10) : 80;
  });
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const consoleMessagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ isResizing: boolean; startX: number; startY: number; startWidth: number; startHeight: number; startLeft: number; startBottom: number; direction: string } | null>(null);
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; startLeft: number; startBottom: number } | null>(null);

  // Center chat window on first load if no saved data exists
  useEffect(() => {
    const hasSavedData = localStorage.getItem('chatWidth') && 
                        localStorage.getItem('chatHeight') && 
                        localStorage.getItem('chatLeft') && 
                        localStorage.getItem('chatBottom');
    
    if (!hasSavedData) {
      // First time - center the chat window
      const screenWidth = document.documentElement.clientWidth || window.innerWidth;
      const screenHeight = document.documentElement.clientHeight || window.innerHeight;
      const defaultWidth = screenWidth * 0.4;
      const defaultHeight = screenHeight * 0.25;
      const centeredLeft = (screenWidth - defaultWidth) / 2;
      const bottomPosition = 20;
      
      setChatWidth(defaultWidth);
      setChatHeight(defaultHeight);
      setChatLeft(centeredLeft);
      setChatBottom(bottomPosition);
    }
  }, []); // Only run on mount

  // Method to handle Enter key from keyboard system
  const handleEnterKey = () => {
    if (!isActive) {
      // First Enter press - activate chat and expand window
      setIsActive(true);
      setIsCollapsed(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      // Second Enter press - send message if not empty, otherwise just deactivate
      const message = inputValue.trim();
      if (message && activeChannel) {
        // Check if it's a LocalChannel (Console) - cannot send to local channels
        if (activeChannel.type === 'local') {
          gc.interface.setCancelMessage("Cannot write to a local channel.");
          // Still deactivate even if we can't send
          setIsActive(false);
          inputRef.current?.blur();
          return;
        }
        
        // Send message based on channel type
        if (activeChannel.type === 'private') {
          // Private channel - send private packet and add message immediately
          // (server response only goes to recipient, not back to sender)
          gc.send(new ChannelPrivatePacket(activeChannel.name, message));
          
          // Add message immediately for sender feedback
          const senderMessage: ChatMessage = {
            id: `sent-${activeChannel.name}-${message}-${Date.now()}`,
            text: message,
            sender: gc.player?.vitals.name || 'You',
            timestamp: new Date(),
            color: '#ffffff',
            type: 1,
            channelName: activeChannel.name
          };
          
          // Add to allMessages for immediate display
          setAllMessages(prev => [...prev, senderMessage]);
        } else if (activeChannel.id !== null) {
          // Regular channel - send with say (loudness 1)
          // Message will appear when server broadcasts it back
          gc.send(new ChannelMessagePacket(activeChannel.id, 1, message));
        }
        
        // Clear input after sending
        setInputValue('');
      }
      
      // Always deactivate chat and blur input (whether message was sent or not)
      setIsActive(false);
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

  // Handle Escape key globally when chat is visible but not active
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isActive && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    if (!isCollapsed) {
      window.addEventListener('keydown', handleGlobalEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleGlobalEscape);
    };
  }, [isActive, isCollapsed]);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>, section: string) => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (ref.current) {
        // Find the parent chat-messages container
        const messagesContainer = ref.current.closest('.chat-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    });
  };

  useEffect(() => {
    // Always scroll to bottom when messages change
    scrollToBottom(chatMessagesEndRef, 'chat');
  }, [allMessages, activeChannel]);

  useEffect(() => {
    // Always scroll to bottom when console messages change
    scrollToBottom(consoleMessagesEndRef, 'console');
  }, [consoleMessages]);

  useEffect(() => {
    // Scroll to bottom when chat window becomes visible (not collapsed)
    if (!isCollapsed) {
      setTimeout(() => {
        scrollToBottom(chatMessagesEndRef, 'chat');
        scrollToBottom(consoleMessagesEndRef, 'console');
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [isCollapsed]);

  useEffect(() => {
    // Initialize with React channel manager
    const initialChannels = reactChannelManager.getChannels();
    setChannels(initialChannels);
    setActiveChannel(reactChannelManager.getActiveChannel());

    // Subscribe to channel changes
    const unsubscribeChannel = reactChannelManager.onChannelChange((channel: Channel) => {
      setActiveChannel(channel);
      // Also update the channels array when it changes
      setChannels(reactChannelManager.getChannels());
      // Scroll to bottom when channel changes to show latest messages
      setTimeout(() => {
        scrollToBottom(chatMessagesEndRef, 'chat');
      }, 0);
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


  const handleChannelChange = (channel: Channel) => {
    // Join the channel if not already joined (except for Console and private channels)
    if (channel.type !== 'local' && channel.type !== 'private' && channel.id !== null) {
      reactChannelManager.joinChannel(channel.id);
    }
    
    // Clear unread count for private channels when switching to them
    if (channel.type === 'private') {
      reactChannelManager.clearUnreadCount(channel.name);
    }
    
    // Set as active channel - use manager's channels array to find the correct index
    const managerChannels = reactChannelManager.getChannels();
    const channelIndex = managerChannels.findIndex(c => {
      if (channel.type === 'private') {
        return c.name === channel.name && c.type === 'private';
      } else {
        return c.id === channel.id && c.name === channel.name;
      }
    });
    
    if (channelIndex !== -1) {
      reactChannelManager.setActiveChannel(channelIndex);
      // Scroll to bottom when switching channels to show latest messages
      setTimeout(() => {
        scrollToBottom(chatMessagesEndRef, 'chat');
      }, 0);
    }
  };

  // Filter messages by active channel
  const getFilteredMessages = () => {
    if (!activeChannel) return [];
    return allMessages.filter(msg => msg.channelName === activeChannel.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isActive) {
        // If chat is active, deactivate it
        setIsActive(false);
        inputRef.current?.blur();
      } else if (!isCollapsed) {
        // If chat is not active and not collapsed, collapse it
        setIsCollapsed(true);
      }
    } else if (e.key === 'ArrowUp' && e.shiftKey) {
      // Handle channel suggestion
      reactChannelManager.suggestPrevious();
    }
  };

  const handleFocus = () => {
    if (!isActive) {
      setIsActive(true);
      setIsCollapsed(false);
    }
  };

  const handleBlur = () => {
    // Let Enter/Escape control deactivation
  };

  const handleInputClick = () => {
    if (!isActive) {
      setIsActive(true);
      setIsCollapsed(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      inputRef.current?.focus();
    }
  };

  const handleCollapseChat = () => {
    setIsCollapsed(true);
    setIsActive(false);
    inputRef.current?.blur();
  };

  // Loudness system removed - all messages use say

  const openChatModal = () => {
    if ((window as any).reactUIManager) {
      (window as any).reactUIManager.openModal('chat');
    }
  };

  // Resize handlers
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 200;
  const MAX_WIDTH = window.innerWidth - 20;
  const MAX_HEIGHT = window.innerHeight - 100;

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!chatWindowRef.current) return;
    
    const rect = chatWindowRef.current.getBoundingClientRect();
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startLeft: chatLeft,
      startBottom: chatBottom,
      direction
    };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeRef.current || !chatWindowRef.current) return;
    
    const { startX, startY, startWidth, startHeight, startLeft, startBottom, direction } = resizeRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newBottom = startBottom;
    
    if (direction.includes('right')) {
      newWidth = Math.min(Math.max(startWidth + deltaX, MIN_WIDTH), MAX_WIDTH);
    }
    if (direction.includes('left')) {
      const widthChange = startWidth - Math.min(Math.max(startWidth - deltaX, MIN_WIDTH), MAX_WIDTH);
      newWidth = Math.min(Math.max(startWidth - deltaX, MIN_WIDTH), MAX_WIDTH);
      newLeft = startLeft + (startWidth - newWidth);
    }
    if (direction.includes('bottom')) {
      newHeight = Math.min(Math.max(startHeight + deltaY, MIN_HEIGHT), MAX_HEIGHT);
    }
    if (direction.includes('top')) {
      const heightChange = startHeight - Math.min(Math.max(startHeight - deltaY, MIN_HEIGHT), MAX_HEIGHT);
      newHeight = Math.min(Math.max(startHeight - deltaY, MIN_HEIGHT), MAX_HEIGHT);
      newBottom = startBottom + (startHeight - newHeight);
    }
    
    setChatWidth(newWidth);
    setChatHeight(newHeight);
    setChatLeft(newLeft);
    setChatBottom(newBottom);
  };

  const handleResizeEnd = () => {
    if (resizeRef.current) {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.channel-tab')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: chatLeft,
      startBottom: chatBottom
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    
    const { startX, startY, startLeft, startBottom } = dragRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = startY - e.clientY; // Invert Y because bottom increases upward
    
    // Use clientWidth/clientHeight for consistency with centering
    const screenWidth = document.documentElement.clientWidth || window.innerWidth;
    const screenHeight = document.documentElement.clientHeight || window.innerHeight;
    
    const newLeft = Math.max(0, Math.min(startLeft + deltaX, screenWidth - chatWidth));
    const newBottom = Math.max(0, Math.min(startBottom + deltaY, screenHeight - chatHeight));
    
    setChatLeft(newLeft);
    setChatBottom(newBottom);
  };

  const handleDragEnd = () => {
    if (dragRef.current) {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    }
  };

  // Save dimensions and position to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatWidth', chatWidth.toString());
    localStorage.setItem('chatHeight', chatHeight.toString());
    localStorage.setItem('chatLeft', chatLeft.toString());
    localStorage.setItem('chatBottom', chatBottom.toString());
  }, [chatWidth, chatHeight, chatLeft, chatBottom]);

  // Show collapsed icon when chat is inactive
  if (isCollapsed) {
    return (
      <div className="chat-collapsed" onClick={() => setIsCollapsed(false)} title="Click to open chat">
        <div className="chat-icon">💬</div>
        {channels.some(ch => ch.type === 'private' && ch.unreadCount && ch.unreadCount > 0) && (
          <div className="chat-notification-dot"></div>
        )}
      </div>
    );
  }

  return (
    <div id="chat-container" className="standalone-component">
    <div 
      ref={chatWindowRef}
      className="chat-window"
      style={{ 
        width: `${chatWidth}px`, 
        height: `${chatHeight}px`,
        left: `${chatLeft}px`,
        bottom: `${chatBottom}px`
      }}
    >
      <div 
        className="chat-header"
        onMouseDown={handleDragStart}
      >
        <div className="chat-channel-tabs">
          {channels.filter(ch => {
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
          }).map((channel) => (
            <div key={channel.id || channel.name} className="channel-tab-wrapper">
              <button
                className={`channel-tab ${activeChannel?.id === channel.id && activeChannel?.name === channel.name ? 'active' : ''} ${channel.type === 'private' ? 'private' : (reactChannelManager.isJoinedToChannel(channel.id!) ? 'joined' : 'not-joined')}`}
                onClick={() => handleChannelChange(channel)}
                title={`Switch to ${channel.name} channel ${channel.type === 'private' ? '(private)' : (reactChannelManager.isJoinedToChannel(channel.id!) ? '(joined)' : '(not joined)')}`}
              >
                {channel.name}
                {channel.type === 'private' && <span className="private-indicator">🔒</span>}
                {channel.type !== 'private' && reactChannelManager.isJoinedToChannel(channel.id!) && <span className="joined-indicator">●</span>}
                {channel.type === 'private' && channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="unread-count">{channel.unreadCount}</span>
                )}
              </button>
              {channel.name !== 'Default' && (
                <button
                  className="channel-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (channel.type === 'private') {
                      // Remove private channel
                      reactChannelManager.removePrivateChannel(channel.name);
                    } else if (channel.id !== null) {
                      // Leave regular channel (World, Trade, Help)
                      reactChannelManager.leaveChannel(channel.id);
                      // If this was the active channel, switch to Default
                      if (activeChannel?.id === channel.id) {
                        const allChannels = reactChannelManager.getChannels();
                        const defaultIndex = allChannels.findIndex(c => c.name === 'Default');
                        if (defaultIndex !== -1) {
                          reactChannelManager.setActiveChannel(defaultIndex);
                        }
                      }
                    }
                  }}
                  title={`Close ${channel.name} channel`}
                >
                  ×
                </button>
              )}
            </div>
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
          <button 
            className="chat-control-btn chat-collapse-btn"
            onClick={handleCollapseChat}
            title="Collapse chat"
          >
            
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

      <div className="chat-input-form">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => isActive && setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleInputClick}
          placeholder={isActive ? "Type a message..." : "Press Enter or click to chat"}
          className={`chat-input ${isActive ? 'active' : 'inactive'}`}
          readOnly={!isActive}
        />
        <button 
          type="button" 
          className="chat-send-btn"
          disabled={!inputValue.trim() || !isActive}
          onClick={handleEnterKey}
        >
          Send
        </button>
      </div>
      
      {/* Resize handles */}
      <div 
        className="resize-handle resize-handle-top"
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />
      <div 
        className="resize-handle resize-handle-right"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      <div 
        className="resize-handle resize-handle-bottom"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
      <div 
        className="resize-handle resize-handle-left"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      <div 
        className="resize-handle resize-handle-top-left"
        onMouseDown={(e) => handleResizeStart(e, 'top-left')}
      />
      <div 
        className="resize-handle resize-handle-top-right"
        onMouseDown={(e) => handleResizeStart(e, 'top-right')}
      />
      <div 
        className="resize-handle resize-handle-bottom-left"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
      />
      <div 
        className="resize-handle resize-handle-bottom-right"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
    </div>
    </div>
  );
}

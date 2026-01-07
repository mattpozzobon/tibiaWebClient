import React, { useState, useRef, useEffect, useCallback } from 'react';
import type GameClient from '../../../../../core/gameclient';
import { ChannelMessagePacket, ChannelPrivatePacket } from '../../../../../core/protocol';
import { reactChannelManager } from '../../../../services/ReactChannelManager';
import './../styles/ChatWindow.scss';

// Components
import ChatCollapsed from './ChatCollapsed';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatInput, { ChatInputRef } from './ChatInput';
import ChatResizeHandles from './ChatResizeHandles';
import { ChatMessage } from './ChatMessage';

// Hooks
import { useChatMessages } from './hooks/useChatMessages';
import { useChatChannels } from './hooks/useChatChannels';
import { useChatResize } from './hooks/useChatResize';
import { useChatDrag } from './hooks/useChatDrag';

interface ChatProps {
  gc: GameClient;
}

export default function Chat({ gc }: ChatProps) {
  // UI State
  const [inputValue, setInputValue] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Window position and size state
  const [chatWidth, setChatWidth] = useState(() => { const saved = localStorage.getItem('chatWidth'); return saved ? parseInt(saved, 10) : 600; });
  const [chatHeight, setChatHeight] = useState(() => { const saved = localStorage.getItem('chatHeight'); return saved ? parseInt(saved, 10) : 350; });
  const [chatLeft, setChatLeft] = useState(() => { const saved = localStorage.getItem('chatLeft'); return saved ? parseInt(saved, 10) : 10; });
  const [chatBottom, setChatBottom] = useState(() => { const saved = localStorage.getItem('chatBottom'); return saved ? parseInt(saved, 10) : 80; });

  // Refs
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputRef>(null);

  // Custom hooks
  const { allMessages, consoleMessages, chatMessagesEndRef, consoleMessagesEndRef, addMessage } = useChatMessages();
  const { channels, activeChannel, handleChannelChange, handleChannelClose } = useChatChannels();

  const { handleResizeStart } = useChatResize({ chatWindowRef, chatWidth, chatHeight, chatLeft, chatBottom, setChatWidth, setChatHeight, setChatLeft, setChatBottom });
  const { handleDragStart } = useChatDrag({ chatWidth, chatHeight, chatLeft, chatBottom, setChatLeft, setChatBottom });

  // Center chat window on first load if no saved data exists
  useEffect(() => {
    const hasSavedData = localStorage.getItem('chatWidth') && 
                        localStorage.getItem('chatHeight') && 
                        localStorage.getItem('chatLeft') && 
                        localStorage.getItem('chatBottom');
    
    if (!hasSavedData) {
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
  }, []);

  // Scroll utility
  const scrollToBottom = useCallback((ref: React.RefObject<HTMLDivElement | null>, section: string) => {
    requestAnimationFrame(() => { if (ref.current) { const messagesContainer = ref.current.closest('.chat-messages'); if (messagesContainer) { messagesContainer.scrollTop = messagesContainer.scrollHeight; } } });
  }, []);

  // Scroll effects
  useEffect(() => {
    scrollToBottom(chatMessagesEndRef, 'chat');
  }, [allMessages, activeChannel, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(consoleMessagesEndRef, 'console');
  }, [consoleMessages, scrollToBottom]);

  useEffect(() => {
    if (!isCollapsed) {
      setTimeout(() => {
        scrollToBottom(chatMessagesEndRef, 'chat');
        scrollToBottom(consoleMessagesEndRef, 'console');
      }, 100);
    }
  }, [isCollapsed, scrollToBottom]);

  // Message sending
  const handleEnterKey = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      setIsCollapsed(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      const message = inputValue.trim();
      if (message && activeChannel) {
        if (activeChannel.type === 'local') {
          gc.interface.setCancelMessage("Cannot write to a local channel.");
          setIsActive(false);
          inputRef.current?.blur();
          return;
        }
        
        if (activeChannel.type === 'private') {
          gc.send(new ChannelPrivatePacket(activeChannel.name, message));
          
          const senderMessage: ChatMessage = {
            id: `sent-${activeChannel.name}-${message}-${Date.now()}`,
            text: message,
            sender: gc.player?.vitals.name || 'You',
            timestamp: new Date(),
            color: '#ffffff',
            type: 1,
            channelName: activeChannel.name
          };
          
          addMessage(senderMessage);
        } else if (activeChannel.id !== null) {
          gc.send(new ChannelMessagePacket(activeChannel.id, 1, message));
        }
        
        setInputValue('');
      }
      
      setIsActive(false);
      inputRef.current?.blur();
    }
  }, [isActive, inputValue, activeChannel, gc, addMessage]);

  // Expose handleEnterKey to global scope
  useEffect(() => {
    (window as any).reactChatWindow = { handleEnterKey };
    return () => {
      delete (window as any).reactChatWindow;
    };
  }, [handleEnterKey]);

  // Global Escape handler
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

  // Input handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isActive) {
        setIsActive(false);
        inputRef.current?.blur();
      } else if (!isCollapsed) {
        setIsCollapsed(true);
      }
    } else if (e.key === 'ArrowUp' && e.shiftKey) {
      reactChannelManager.suggestPrevious();
    }
  }, [isActive, isCollapsed]);

  const handleFocus = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      setIsCollapsed(false);
    }
  }, [isActive]);

  const handleBlur = useCallback(() => { /* Let Enter/Escape control deactivation */ }, []);

  const handleInputClick = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      setIsCollapsed(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      inputRef.current?.focus();
    }
  }, [isActive]);

  const handleCollapseChat = useCallback(() => {
    setIsCollapsed(true);
    setIsActive(false);
    inputRef.current?.blur();
  }, []);

  const openChatModal = useCallback(() => { if ((window as any).reactUIManager) { (window as any).reactUIManager.openModal('chat'); } }, []);

  // Filter messages by active channel
  const getFilteredMessages = useCallback(() => { if (!activeChannel) return []; return allMessages.filter(msg => msg.channelName === activeChannel.name); }, [allMessages, activeChannel]);

  // Save dimensions and position to localStorage
  useEffect(() => {
    localStorage.setItem('chatWidth', chatWidth.toString());
    localStorage.setItem('chatHeight', chatHeight.toString());
    localStorage.setItem('chatLeft', chatLeft.toString());
    localStorage.setItem('chatBottom', chatBottom.toString());
  }, [chatWidth, chatHeight, chatLeft, chatBottom]);

  // Scroll when channel changes
  useEffect(() => { if (activeChannel) { setTimeout(() => { scrollToBottom(chatMessagesEndRef, 'chat'); }, 0); } }, [activeChannel, scrollToBottom]);

  // Collapsed view
  if (isCollapsed) {
    return (
      <ChatCollapsed channels={channels} onExpand={() => setIsCollapsed(false)} />
    );
  }

  return (
    <div id="chat-container" className="standalone-component">
      <div ref={chatWindowRef} className="chat-window" style={{ width: `${chatWidth}px`, height: `${chatHeight}px`, left: `${chatLeft}px`, bottom: `${chatBottom}px` }}>
        <ChatHeader channels={channels} activeChannel={activeChannel} onChannelChange={handleChannelChange} onChannelClose={handleChannelClose} onOpenChatModal={openChatModal} onCollapseChat={handleCollapseChat} onDragStart={handleDragStart} />
        
        <div className="chat-messages-container">
          <div className="chat-messages-section">
            <div className="chat-section-header">
              💬 {activeChannel?.name || 'Chat'}
            </div>
            <ChatMessageList messages={getFilteredMessages()} messagesEndRef={chatMessagesEndRef} />
          </div>
          
          <div className="chat-messages-section">
            <div className="chat-section-header">🔧 Console</div>
            <ChatMessageList messages={consoleMessages} messagesEndRef={consoleMessagesEndRef} />
          </div>
        </div>

        <ChatInput ref={inputRef} value={inputValue} isActive={isActive} onChange={setInputValue} onKeyDown={handleKeyDown} onFocus={handleFocus} onBlur={handleBlur} onClick={handleInputClick} onSend={handleEnterKey} />
        
        <ChatResizeHandles onResizeStart={handleResizeStart} />
      </div>
    </div>
  );
}

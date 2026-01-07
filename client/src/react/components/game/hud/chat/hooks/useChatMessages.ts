import { useState, useEffect, useRef } from 'react';
import { chatEventManager, ChatMessageData } from '../../../../../services/ChatEventManager';
import { ChatMessage } from '../ChatMessage';

const MAX_CONSOLE_MESSAGES = 50;
const MAX_MESSAGES = 200;

export function useChatMessages() {
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [consoleMessages, setConsoleMessages] = useState<ChatMessage[]>([]);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const consoleMessagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
          return [...prev.slice(-(MAX_CONSOLE_MESSAGES - 1)), chatMessage];
        });
      } else {
        // Add to all messages for channel filtering
        setAllMessages(prev => {
          const exists = prev.some(msg => msg.id === chatMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev.slice(-(MAX_MESSAGES - 1)), chatMessage];
        });
      }
    });

    return () => {
      unsubscribeMessages();
    };
  }, []);

  const addMessage = (message: ChatMessage) => {
    setAllMessages(prev => [...prev.slice(-(MAX_MESSAGES - 1)), message]);
  };

  return {
    allMessages,
    consoleMessages,
    chatMessagesEndRef,
    consoleMessagesEndRef,
    addMessage
  };
}

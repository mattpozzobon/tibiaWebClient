import { useRef } from 'react';

interface UseChatDragProps {
  chatWidth: number;
  chatHeight: number;
  chatLeft: number;
  chatBottom: number;
  setChatLeft: (left: number) => void;
  setChatBottom: (bottom: number) => void;
}

export function useChatDrag({
  chatWidth,
  chatHeight,
  chatLeft,
  chatBottom,
  setChatLeft,
  setChatBottom
}: UseChatDragProps) {
  const dragRef = useRef<{ 
    isDragging: boolean; 
    startX: number; 
    startY: number; 
    startLeft: number; 
    startBottom: number 
  } | null>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements or message areas
    const target = e.target as HTMLElement;
    if (target.closest('button') || 
        target.closest('input') || 
        target.closest('.channel-tab') ||
        target.closest('.chat-messages') ||
        target.closest('.message') ||
        target.closest('.chat-messages-container') ||
        target.closest('.chat-messages-section')) {
      return; // Allow text selection in messages
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

  return { handleDragStart };
}

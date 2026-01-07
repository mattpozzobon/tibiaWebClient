import { useRef, useState, useEffect } from 'react';

interface UseChatResizeProps {
  chatWindowRef: React.RefObject<HTMLDivElement | null>;
  chatWidth: number;
  chatHeight: number;
  chatLeft: number;
  chatBottom: number;
  setChatWidth: (width: number) => void;
  setChatHeight: (height: number) => void;
  setChatLeft: (left: number) => void;
  setChatBottom: (bottom: number) => void;
}

export function useChatResize({
  chatWindowRef,
  chatWidth,
  chatHeight,
  chatLeft,
  chatBottom,
  setChatWidth,
  setChatHeight,
  setChatLeft,
  setChatBottom
}: UseChatResizeProps) {
  const resizeRef = useRef<{ 
    isResizing: boolean; 
    startX: number; 
    startY: number; 
    startWidth: number; 
    startHeight: number; 
    startLeft: number; 
    startBottom: number; 
    direction: string 
  } | null>(null);

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
      newWidth = Math.min(Math.max(startWidth - deltaX, MIN_WIDTH), MAX_WIDTH);
      newLeft = startLeft + (startWidth - newWidth);
    }
    if (direction.includes('bottom')) {
      newHeight = Math.min(Math.max(startHeight + deltaY, MIN_HEIGHT), MAX_HEIGHT);
    }
    if (direction.includes('top')) {
      const requestedHeight = startHeight - deltaY;
      newHeight = Math.min(Math.max(requestedHeight, MIN_HEIGHT), MAX_HEIGHT);
      // Adjust bottom to keep the bottom edge fixed
      const heightChange = newHeight - startHeight;
      newBottom = startBottom - heightChange;
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

  return { handleResizeStart };
}

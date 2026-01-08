import React, { useRef, useState, useEffect } from 'react';
import './styles/Window.scss';

export interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onPin?: (pinned: boolean) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onResize?: (height: number) => void;
  isDragging?: boolean;
  isPinned?: boolean;
  className?: string;
  height?: number;
}

export default function Window({ 
  id, 
  title, 
  children, 
  onClose, 
  onDragStart, 
  onDragEnd, 
  onPin,
  onDrop,
  onDragOver,
  onResize,
  isDragging = false,
  isPinned = false,
  className = '',
  height
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentHeight, setCurrentHeight] = useState<number | undefined>(height);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null);


  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    onDragStart?.();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    onDragEnd?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(e);
  };

  // Track natural content height
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Measure natural height by temporarily removing height constraint
    const measureNaturalHeight = () => {
      if (contentRef.current) {
        // Temporarily remove height to measure natural size
        const originalHeight = contentRef.current.style.height;
        const originalOverflow = contentRef.current.style.overflow;
        contentRef.current.style.height = 'auto';
        contentRef.current.style.overflow = 'visible';
        
        const contentHeight = contentRef.current.scrollHeight;
        const headerHeight = 12;
        const natural = contentHeight + headerHeight;
        
        // Restore original styles
        contentRef.current.style.height = originalHeight;
        contentRef.current.style.overflow = originalOverflow;
        
        setNaturalHeight(natural);
      }
    };
    
    // Use requestAnimationFrame to ensure content is rendered
    requestAnimationFrame(() => {
      setTimeout(measureNaturalHeight, 100);
    });
  }, [children]);

  // Resize handlers
  useEffect(() => {
    if (height !== undefined && height !== currentHeight) {
      setCurrentHeight(height);
    }
  }, [height]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = windowRef.current?.offsetHeight || 0;
    const maxHeight = naturalHeight || startHeight; // Use natural height as max

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(100, Math.min(maxHeight, startHeight + deltaY)); // Clamp between min and max
      
      // Update both window and content heights simultaneously for smooth resizing
      if (windowRef.current) {
        windowRef.current.style.height = `${newHeight}px`;
      }
      if (contentRef.current) {
        contentRef.current.style.height = `calc(${newHeight}px - 12px)`;
      }
      
      setCurrentHeight(newHeight);
      onResize?.(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={windowRef}
      className={`window ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''} ${isPinned ? 'pinned' : ''} ${isResizing ? 'resizing' : ''} ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={currentHeight ? { height: `${currentHeight}px`, transition: isResizing ? 'none' : 'height 0.1s ease' } : undefined}
    >
      <div 
        ref={headerRef}
        className="window-header"
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ cursor: 'grab' }}
        data-window-id={id}
      >
        <span className="window-title">{title}</span>
        <div className="window-controls">
          {onPin && (
            <button 
              className={`window-control pin ${isPinned ? 'active' : ''}`}
              onClick={() => onPin(!isPinned)}
              title={isPinned ? 'Unpin from bottom' : 'Pin to bottom'}
            >
              📌
            </button>
          )}
          <button 
            className="window-control minimize"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            {isMinimized ? '□' : '−'}
          </button>
          {onClose && (
            <button 
              className="window-control close"
              onClick={onClose}
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div 
            ref={contentRef}
            className={`window-content ${className === 'container-window' ? 'container-scrollable' : ''}`}
            style={currentHeight ? { 
              height: `calc(${currentHeight}px - 12px)`, 
              overflowY: currentHeight < (naturalHeight || Infinity) 
                ? (className === 'container-window' ? ('overlay' as any) : 'auto')
                : 'visible',
              overflowX: 'hidden'
            } : undefined}
          >
            {children}
          </div>
          {onResize && (
            <div 
              ref={resizeHandleRef}
              className="window-resize-handle"
              onMouseDown={handleResizeStart}
              title="Resize window"
            />
          )}
        </>
      )}
    </div>
  );
}

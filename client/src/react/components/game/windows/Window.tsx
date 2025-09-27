import React, { useRef, useState, useEffect } from 'react';
import './styles/Window.scss';

export interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  className?: string;
}

export default function Window({ 
  id, 
  title, 
  children, 
  onClose, 
  onDragStart, 
  onDragEnd, 
  isDragging = false,
  className = ''
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('Mouse down on header:', id);
    // Don't prevent default - let the browser handle drag
  };

  const handleDragStart = (e: React.DragEvent) => {
    console.log('Drag start:', id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    onDragStart?.();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    console.log('Drag end:', id);
    e.preventDefault();
    onDragEnd?.();
  };

  return (
    <div 
      ref={windowRef}
      className={`window ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''} ${className}`}
    >
      <div 
        ref={headerRef}
        className="window-header"
        draggable={true}
        onMouseDown={handleMouseDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ cursor: 'grab' }}
        data-window-id={id}
      >
        <span className="window-title">{title}</span>
        <div className="window-controls">
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
        <div className="window-content">
          {children}
        </div>
      )}
    </div>
  );
}

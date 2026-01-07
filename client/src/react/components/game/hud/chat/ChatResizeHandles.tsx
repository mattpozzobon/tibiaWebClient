import React from 'react';

interface ChatResizeHandlesProps {
  onResizeStart: (e: React.MouseEvent, direction: string) => void;
}

export default function ChatResizeHandles({ onResizeStart }: ChatResizeHandlesProps) {
  return (
    <>
      <div className="resize-handle resize-handle-top" onMouseDown={(e) => onResizeStart(e, 'top')} />
      <div className="resize-handle resize-handle-right" onMouseDown={(e) => onResizeStart(e, 'right')} />
      <div className="resize-handle resize-handle-bottom" onMouseDown={(e) => onResizeStart(e, 'bottom')} />
      <div className="resize-handle resize-handle-left" onMouseDown={(e) => onResizeStart(e, 'left')} />
      <div className="resize-handle resize-handle-top-left" onMouseDown={(e) => onResizeStart(e, 'top-left')} />
      <div className="resize-handle resize-handle-top-right" onMouseDown={(e) => onResizeStart(e, 'top-right')} />
      <div className="resize-handle resize-handle-bottom-left" onMouseDown={(e) => onResizeStart(e, 'bottom-left')} />
      <div className="resize-handle resize-handle-bottom-right" onMouseDown={(e) => onResizeStart(e, 'bottom-right')} />
    </>
  );
}

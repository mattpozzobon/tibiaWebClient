import React from 'react';
import { Window } from '../index';
import type { WindowData } from '../WindowManager';

interface WindowGroupProps {
  windows: WindowData[];
  isPinned: boolean;
  draggedWindow: string | null;
  onWindowClose: (windowId: string) => void;
  onDragStart: (windowId: string) => void;
  onDragEnd: () => void;
  onTogglePin: (windowId: string) => void;
  onWindowDrop: (e: React.DragEvent, targetWindowId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onWindowResize?: (windowId: string, height: number) => void;
}

export default function WindowGroup({
  windows,
  isPinned,
  draggedWindow,
  onWindowClose,
  onDragStart,
  onDragEnd,
  onTogglePin,
  onWindowDrop,
  onDragOver,
  onWindowResize,
}: WindowGroupProps) {
  return (
    <div className={isPinned ? 'window-group-bottom' : 'window-group-top'}>
      {windows.map((window) => (
        <Window
          key={`${window.id}-${isPinned ? 'pinned' : 'unpinned'}`}
          id={window.id}
          title={window.title}
          onClose={() => onWindowClose(window.id)}
          onDragStart={() => onDragStart(window.id)}
          onDragEnd={onDragEnd}
          onPin={() => onTogglePin(window.id)}
          onDrop={(e) => onWindowDrop(e, window.id)}
          onDragOver={onDragOver}
          onResize={onWindowResize && window.className === 'container-window' ? (height) => onWindowResize(window.id, height) : undefined}
          isDragging={draggedWindow === window.id}
          isPinned={isPinned}
          className={window.className}
          height={window.height}
        >
          {window.component}
        </Window>
      ))}
    </div>
  );
}

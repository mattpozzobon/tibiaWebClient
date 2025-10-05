import React from 'react';
import WindowHeader from './WindowHeader';
import WindowGroup from './WindowGroup';
import { COLUMN_TYPES, type ColumnType } from '../constants';
import type { WindowData } from '../WindowManager';

interface WindowColumnProps {
  column: ColumnType;
  windows: WindowData[];
  pinnedWindows: WindowData[];
  autoOpenContainers: boolean;
  showSubPanel?: boolean;
  draggedWindow: string | null;
  columnRef: React.RefObject<HTMLDivElement | null>;
  onToggleWindow: (windowId: string, column: ColumnType) => void;
  onToggleAutoOpenContainers: (column: ColumnType) => void;
  onToggleSubPanel?: (panel: 'left' | 'right') => void;
  onWindowClose: (windowId: string) => void;
  onDragStart: (windowId: string) => void;
  onDragEnd: () => void;
  onTogglePin: (windowId: string) => void;
  onColumnDrop: (e: React.DragEvent, column: ColumnType) => void;
  onWindowDrop: (e: React.DragEvent, targetWindowId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export default function WindowColumn({
  column,
  windows,
  pinnedWindows,
  autoOpenContainers,
  showSubPanel,
  draggedWindow,
  columnRef,
  onToggleWindow,
  onToggleAutoOpenContainers,
  onToggleSubPanel,
  onWindowClose,
  onDragStart,
  onDragEnd,
  onTogglePin,
  onColumnDrop,
  onWindowDrop,
  onDragOver,
}: WindowColumnProps) {
  const getColumnClassName = () => {
    const baseClass = `window-column window-column-${column}`;
    return draggedWindow ? `${baseClass} drag-active` : baseClass;
  };

  return (
    <div 
      className={getColumnClassName()}
      ref={columnRef}
      onDrop={(e) => onColumnDrop(e, column)}
      onDragOver={onDragOver}
    >
      <WindowHeader
        column={column}
        windows={windows}
        pinnedWindows={pinnedWindows}
        autoOpenContainers={autoOpenContainers}
        showSubPanel={showSubPanel}
        onToggleWindow={onToggleWindow}
        onToggleAutoOpenContainers={onToggleAutoOpenContainers}
        onToggleSubPanel={onToggleSubPanel}
      />
      
      <WindowGroup
        windows={windows}
        isPinned={false}
        draggedWindow={draggedWindow}
        onWindowClose={onWindowClose}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTogglePin={onTogglePin}
        onWindowDrop={onWindowDrop}
        onDragOver={onDragOver}
      />
      
      <WindowGroup
        windows={pinnedWindows}
        isPinned={true}
        draggedWindow={draggedWindow}
        onWindowClose={onWindowClose}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTogglePin={onTogglePin}
        onWindowDrop={onWindowDrop}
        onDragOver={onDragOver}
      />
    </div>
  );
}

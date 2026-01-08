import React from 'react';
import WindowColumn from './WindowColumn';
import { type ColumnType } from '../constants';
import type { WindowData } from '../WindowManager';

interface ColumnConfig {
  column: ColumnType;
  windows: WindowData[];
  pinnedWindows: WindowData[];
  showSubPanel?: boolean;
  columnRef: React.RefObject<HTMLDivElement | null>;
  hasSubPanel: boolean;
  condition?: boolean;
}

interface WindowColumnRendererProps {
  config: ColumnConfig;
  autoOpenContainers: boolean;
  draggedWindow: string | null;
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
  onWindowResize?: (windowId: string, height: number) => void;
}

export default function WindowColumnRenderer({
  config,
  autoOpenContainers,
  draggedWindow,
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
  onWindowResize,
}: WindowColumnRendererProps) {
  // If there's a condition and it's false, don't render
  if (config.condition !== undefined && !config.condition) {
    return null;
  }

  return (
    <WindowColumn
      column={config.column}
      windows={config.windows}
      pinnedWindows={config.pinnedWindows}
      autoOpenContainers={autoOpenContainers}
      showSubPanel={config.showSubPanel}
      draggedWindow={draggedWindow}
      columnRef={config.columnRef}
      onToggleWindow={onToggleWindow}
      onToggleAutoOpenContainers={onToggleAutoOpenContainers}
      onToggleSubPanel={onToggleSubPanel}
      onWindowClose={onWindowClose}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTogglePin={onTogglePin}
      onColumnDrop={onColumnDrop}
      onWindowDrop={onWindowDrop}
      onDragOver={onDragOver}
      onWindowResize={onWindowResize}
    />
  );
}

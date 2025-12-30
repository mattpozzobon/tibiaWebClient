import React from 'react';
import { WINDOW_ICONS, TOOLTIPS, COLUMN_TYPES, type ColumnType } from '../constants';

interface WindowHeaderProps {
  column: ColumnType;
  windows: Array<{ id: string; column: ColumnType }>;
  pinnedWindows: Array<{ id: string; column: ColumnType }>;
  autoOpenContainers: boolean;
  showSubPanel?: boolean;
  onToggleWindow: (windowId: string, column: ColumnType) => void;
  onToggleAutoOpenContainers: (column: ColumnType) => void;
  onToggleSubPanel?: (panel: 'left' | 'right') => void;
}

export default function WindowHeader({
  column,
  windows,
  pinnedWindows,
  autoOpenContainers,
  showSubPanel,
  onToggleWindow,
  onToggleAutoOpenContainers,
  onToggleSubPanel,
}: WindowHeaderProps) {
  const isEquipmentActive = windows.some(w => w.id === 'equipment') || pinnedWindows.some(w => w.id === 'equipment');
  const isMinimapActive = windows.some(w => w.id === 'minimap') || pinnedWindows.some(w => w.id === 'minimap');

  const getSubPanelToggleIcon = () => {
    if (column === COLUMN_TYPES.LEFT) return WINDOW_ICONS.ADD_LEFT_SUB_PANEL;
    if (column === COLUMN_TYPES.RIGHT) return WINDOW_ICONS.ADD_RIGHT_SUB_PANEL;
    return null;
  };

  const getSubPanelTooltip = () => {
    if (column === COLUMN_TYPES.LEFT) {
      return showSubPanel ? TOOLTIPS.HIDE_LEFT_SUB_PANEL : TOOLTIPS.SHOW_LEFT_SUB_PANEL;
    }
    if (column === COLUMN_TYPES.RIGHT) {
      return showSubPanel ? TOOLTIPS.HIDE_RIGHT_SUB_PANEL : TOOLTIPS.SHOW_RIGHT_SUB_PANEL;
    }
    return '';
  };

  return (
    <div className="window-column-header">
      <button className={`window-icon ${isEquipmentActive ? 'active' : ''}`} onClick={() => onToggleWindow('equipment', column)} title={TOOLTIPS.EQUIPMENT}>
        {WINDOW_ICONS.EQUIPMENT}
      </button>
      
      <button 
        className={`window-icon ${isMinimapActive ? 'active' : ''}`}
        onClick={() => onToggleWindow('minimap', column)}
        title={TOOLTIPS.MINIMAP}
      >
        {WINDOW_ICONS.MINIMAP}
      </button>
      
      <button 
        className={`window-icon ${autoOpenContainers ? 'active' : ''}`}
        onClick={() => onToggleAutoOpenContainers(column)}
        title={autoOpenContainers ? TOOLTIPS.AUTO_OPEN_ON : TOOLTIPS.AUTO_OPEN_OFF}
      >
        {WINDOW_ICONS.AUTO_OPEN_CONTAINERS}
      </button>
      
      {onToggleSubPanel && getSubPanelToggleIcon() && (
        <button className={`window-icon ${showSubPanel ? 'active' : ''}`} onClick={() => onToggleSubPanel(column === COLUMN_TYPES.LEFT ? 'left' : 'right')} title={getSubPanelTooltip()}>
          {getSubPanelToggleIcon()}
        </button>
      )}
    </div>
  );
}

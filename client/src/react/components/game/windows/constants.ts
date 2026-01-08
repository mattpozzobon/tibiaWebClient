// Window Manager Constants

export const LOCALSTORAGE_KEYS = {
  WINDOW_STATE: 'tibia-window-state',
  AUTO_OPEN_CONTAINERS_COLUMN: 'tibia-auto-open-containers-column',
  SHOW_LEFT_SUB_PANEL: 'tibia-show-left-sub-panel',
  SHOW_RIGHT_SUB_PANEL: 'tibia-show-right-sub-panel',
  BACKPACK_COLUMN: 'tibia-backpack-column',
} as const;

export const WINDOW_TYPES = {
  EQUIPMENT: 'equipment',
  MINIMAP: 'minimap',
  CONTAINER: 'container',
  STATUS: 'status',
  FRIENDS: 'friends',
} as const;

export const COLUMN_TYPES = {
  LEFT: 'left',
  RIGHT: 'right',
  LEFT_SUB: 'left-sub',
  RIGHT_SUB: 'right-sub',
} as const;

export const PANEL_TYPES = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export const WINDOW_ICONS = {
  EQUIPMENT: '🧥',
  MINIMAP: '🗺️',
  STATUS: '❤️',
  FRIENDS: '👥',
  AUTO_OPEN_CONTAINERS: '📦',
  ADD_LEFT_SUB_PANEL: '➡️',
  ADD_RIGHT_SUB_PANEL: '⬅️',
} as const;

export const WINDOW_TITLES = {
  EQUIPMENT: 'Equipment',
  MINIMAP: 'Minimap',
  STATUS: 'Status',
  FRIENDS: 'Friends',
} as const;

export const WINDOW_CLASSES = {
  EQUIPMENT: 'equipment-window',
  MINIMAP: 'minimap-window',
  CONTAINER: 'container-window',
  STATUS: 'status-window',
  FRIENDS: 'friends-window',
} as const;

export const TOOLTIPS = {
  EQUIPMENT: 'Equipment',
  MINIMAP: 'Minimap',
  STATUS: 'Status',
  FRIENDS: 'Friends',
  AUTO_OPEN_ON: 'Auto-open containers: ON',
  AUTO_OPEN_OFF: 'Auto-open containers: OFF',
  SHOW_LEFT_SUB_PANEL: 'Show right sub-panel',
  HIDE_LEFT_SUB_PANEL: 'Hide right sub-panel',
  SHOW_RIGHT_SUB_PANEL: 'Show left sub-panel',
  HIDE_RIGHT_SUB_PANEL: 'Hide left sub-panel',
} as const;

export type ColumnType = typeof COLUMN_TYPES[keyof typeof COLUMN_TYPES];
export type PanelType = typeof PANEL_TYPES[keyof typeof PANEL_TYPES];
export type WindowType = typeof WINDOW_TYPES[keyof typeof WINDOW_TYPES];

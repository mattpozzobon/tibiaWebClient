import React, { useState, useRef, useCallback, createContext, useContext, useEffect, useMemo } from 'react';
import './styles/WindowManager.scss';
import { EquipmentWindow, MinimapWindow } from './index';
import WindowColumnRenderer from './components/WindowColumnRenderer';
import { LOCALSTORAGE_KEYS, COLUMN_TYPES, WINDOW_TYPES, WINDOW_CLASSES, type ColumnType } from './constants';
import { useLocalStorage, useLocalStorageString } from './hooks/useLocalStorage';
import type GameClient from '../../../../core/gameclient';

export interface WindowData {
  id: string;
  title: string;
  component: React.ReactNode;
  column: ColumnType;
  order: number;
  className?: string;
  pinned?: boolean;
}

export interface SerializableWindowData {
  id: string;
  title: string;
  column: ColumnType;
  order: number;
  className?: string;
  pinned?: boolean;
}

interface WindowManagerContextType {
  addWindow: (windowData: WindowData) => void;
  removeWindow: (windowId: string) => void;
  moveWindow: (windowId: string, newColumn: ColumnType) => void;
  togglePin: (windowId: string) => void;
  windows: WindowData[];
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManager');
  }
  return context;
};

interface WindowManagerProps {
  children?: React.ReactNode;
  gc?: GameClient;
}


export default function WindowManager({ children, gc }: WindowManagerProps) {
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  
  // Use custom localStorage hooks for better performance and cleaner code
  const [autoOpenContainersColumnRaw, setAutoOpenContainersColumnRaw] = useLocalStorageString(LOCALSTORAGE_KEYS.AUTO_OPEN_CONTAINERS_COLUMN, null);
  
  // Ensure the column value is properly typed
  const autoOpenContainersColumn: ColumnType | null = autoOpenContainersColumnRaw && Object.values(COLUMN_TYPES).includes(autoOpenContainersColumnRaw as ColumnType) 
    ? (autoOpenContainersColumnRaw as ColumnType) 
    : null;
  
  const setAutoOpenContainersColumn = useCallback((value: ColumnType | null | ((prev: ColumnType | null) => ColumnType | null)) => {
    if (typeof value === 'function') {
      setAutoOpenContainersColumnRaw((prev) => {
        const newValue = value(prev && Object.values(COLUMN_TYPES).includes(prev as ColumnType) ? (prev as ColumnType) : null);
        return newValue;
      });
    } else {
      setAutoOpenContainersColumnRaw(value);
    }
  }, [setAutoOpenContainersColumnRaw]);
  
  const [showLeftSubPanel, setShowLeftSubPanel] = useLocalStorage(LOCALSTORAGE_KEYS.SHOW_LEFT_SUB_PANEL, false);
  const [showRightSubPanel, setShowRightSubPanel] = useLocalStorage(LOCALSTORAGE_KEYS.SHOW_RIGHT_SUB_PANEL, false);
  
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const rightColumnRef = useRef<HTMLDivElement | null>(null);
  const leftSubPanelRef = useRef<HTMLDivElement | null>(null);
  const rightSubPanelRef = useRef<HTMLDivElement | null>(null);



  const toggleAutoOpenContainers = useCallback((column: ColumnType) => {
    // If the same column is clicked, toggle it off; otherwise set it as active
    setAutoOpenContainersColumn(prev => prev === column ? null : column);
  }, [setAutoOpenContainersColumn]);

  const toggleSubPanel = useCallback((panel: 'left' | 'right') => {
    if (panel === 'left') {
      setShowLeftSubPanel(prev => {
        const newValue = !prev;
        // If hiding the left sub-panel and it has auto-open enabled, transfer to left main panel
        if (!newValue && autoOpenContainersColumn === COLUMN_TYPES.LEFT_SUB) {
          setAutoOpenContainersColumn(COLUMN_TYPES.LEFT);
        }
        return newValue;
      });
    } else {
      setShowRightSubPanel(prev => {
        const newValue = !prev;
        // If hiding the right sub-panel and it has auto-open enabled, transfer to right main panel
        if (!newValue && autoOpenContainersColumn === COLUMN_TYPES.RIGHT_SUB) {
          setAutoOpenContainersColumn(COLUMN_TYPES.RIGHT);
        }
        return newValue;
      });
    }
  }, [autoOpenContainersColumn, setShowLeftSubPanel, setShowRightSubPanel, setAutoOpenContainersColumn]);


  // Load window state from localStorage on mount
  useEffect(() => {
    if (!gc) return; // Wait for game client to be available
    
    try {
      const savedState = localStorage.getItem(LOCALSTORAGE_KEYS.WINDOW_STATE);
      if (savedState) {
        const parsedWindows: SerializableWindowData[] = JSON.parse(savedState);
        if (Array.isArray(parsedWindows)) {
          // Recreate windows with components (only equipment and minimap)
          const restoredWindows: WindowData[] = parsedWindows
            .filter(windowConfig => !windowConfig.id.startsWith(WINDOW_TYPES.CONTAINER + '-')) // Explicitly exclude containers
            .map(windowConfig => {
              let component: React.ReactNode;
              
              if (windowConfig.id === WINDOW_TYPES.EQUIPMENT) {
                component = <EquipmentWindow gc={gc} containerIndex={0} />;
              } else if (windowConfig.id === WINDOW_TYPES.MINIMAP) {
                component = <MinimapWindow gc={gc} />;
              } 
              
              return {
                ...windowConfig,
                component
              };
            }).filter(window => window.component !== null); // Remove windows we chose not to restore
          
          setWindows(restoredWindows);
        }
      }
    } catch (error) {
      console.warn('Failed to load window state from localStorage:', error);
    }
  }, [gc]);

  // Save window state to localStorage whenever windows change
  useEffect(() => {
    try {
      // Persist only equipment and minimap windows (NOT containers)
      const serializableWindows: SerializableWindowData[] = windows
        .filter(window => !window.id.startsWith(WINDOW_TYPES.CONTAINER + '-'))
        .map(window => ({
          id: window.id,
          title: window.title,
          column: window.column,
          order: window.order,
          className: window.className,
          pinned: window.pinned
        }));
      
      localStorage.setItem(LOCALSTORAGE_KEYS.WINDOW_STATE, JSON.stringify(serializableWindows));
    } catch (error) {
      console.warn('Failed to save window state to localStorage:', error);
    }
  }, [windows]);

  const addWindow = useCallback((windowData: WindowData) => {
    setWindows(prev => {
      // Check if window with this ID already exists
      if (prev.some(w => w.id === windowData.id)) {
        console.log(`Window with ID '${windowData.id}' already exists, skipping...`);
        return prev;
      }
      
      // Get the highest order in the target column
      const maxOrder = Math.max(
        0,
        ...prev
          .filter(w => w.column === windowData.column)
          .map(w => w.order)
      );
      
      return [...prev, { ...windowData, order: maxOrder + 1 }];
    });
  }, []);

  const removeWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.filter(w => w.id !== windowId));
  }, []);

  const moveWindow = useCallback((windowId: string, newColumn: ColumnType) => {
    setWindows(prev => {
      const window = prev.find(w => w.id === windowId);
      if (!window) return prev;

      // Get the highest order in the target column
      const maxOrder = Math.max(
        0,
        ...prev
          .filter(w => w.column === newColumn && w.id !== windowId)
          .map(w => w.order)
      );

      return prev.map(w => 
        w.id === windowId 
          ? { ...w, column: newColumn, order: maxOrder + 1 }
          : w
      );
    });
  }, []);

  const togglePin = useCallback((windowId: string) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, pinned: !w.pinned }
        : w
    ));
  }, []);


  const handleDragStart = useCallback((windowId: string) => {
    setDraggedWindow(windowId);
  }, []);

  const handleWindowClose = useCallback((windowId: string) => {
    // Check if this is a container window
    if (windowId.startsWith(WINDOW_TYPES.CONTAINER + '-')) {
      const containerId = parseInt(windowId.replace(WINDOW_TYPES.CONTAINER + '-', ''));
      
      // Send close packet to server
      const container = window.gameClient?.player?.getContainer(containerId);
      if (container) {
        window.gameClient?.player?.closeContainer(container);
      }
    }
    
    // Remove the window from the UI
    removeWindow(windowId);
  }, [removeWindow]);

  const handleDragEnd = useCallback(() => {
    setDraggedWindow(null);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, column: ColumnType) => {
    e.preventDefault();
    const windowId = e.dataTransfer.getData('text/plain');
    if (windowId) {
      moveWindow(windowId, column);
      setDraggedWindow(null);
    }
  }, [moveWindow]);

  const handleWindowDrop = useCallback((e: React.DragEvent, targetWindowId: string) => {
    e.preventDefault();
    const draggedWindowId = e.dataTransfer.getData('text/plain');
    
    if (draggedWindowId && draggedWindowId !== targetWindowId) {
      const draggedWindow = windows.find(w => w.id === draggedWindowId);
      const targetWindow = windows.find(w => w.id === targetWindowId);
      
      if (draggedWindow && targetWindow) {
        // Move the dragged window to the same column as the target
        const targetColumn = targetWindow.column;
        
        // Calculate the new order based on drop position
        const rect = e.currentTarget.getBoundingClientRect();
        const dropY = e.clientY - rect.top;
        const isAbove = dropY < rect.height / 2;
        
        // Get all windows in the target column, excluding the dragged window
        const columnWindows = windows
          .filter(w => w.column === targetColumn && w.id !== draggedWindowId)
          .sort((a, b) => a.order - b.order);
        
        let newOrder: number;
        
        if (isAbove) {
          // Place above the target window
          const targetIndex = columnWindows.findIndex(w => w.id === targetWindowId);
          if (targetIndex === 0) {
            // Place at the beginning
            newOrder = Math.max(0, targetWindow.order - 1);
          } else {
            // Place between the previous window and target
            const prevWindow = columnWindows[targetIndex - 1];
            newOrder = (prevWindow.order + targetWindow.order) / 2;
          }
        } else {
          // Place below the target window
          const targetIndex = columnWindows.findIndex(w => w.id === targetWindowId);
          if (targetIndex === columnWindows.length - 1) {
            // Place at the end
            newOrder = targetWindow.order + 1;
          } else {
            // Place between target and next window
            const nextWindow = columnWindows[targetIndex + 1];
            newOrder = (targetWindow.order + nextWindow.order) / 2;
          }
        }
        
        // Update the window position
        setWindows(prev => prev.map(w => 
          w.id === draggedWindowId 
            ? { ...w, column: targetColumn, order: newOrder }
            : w
        ));
      }
    }
    
    setDraggedWindow(null);
  }, [windows]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Factory function to create window data
  const createWindowData = useCallback((windowId: string, column: ColumnType): WindowData | null => {
    if (!gc) return null;

    switch (windowId) {
      case WINDOW_TYPES.EQUIPMENT:
        return {
          id: WINDOW_TYPES.EQUIPMENT,
          title: 'Equipment',
          component: <EquipmentWindow gc={gc} containerIndex={0} />,
          column,
          order: 0,
          className: WINDOW_CLASSES.EQUIPMENT,
          pinned: false
        };
      case WINDOW_TYPES.MINIMAP:
        return {
          id: WINDOW_TYPES.MINIMAP,
          title: 'Minimap',
          component: <MinimapWindow gc={gc} />,
          column,
          order: 0,
          className: WINDOW_CLASSES.MINIMAP,
          pinned: false
        };
      default:
        return null;
    }
  }, [gc]);

  const toggleWindow = useCallback((windowId: string, column: ColumnType) => {
    const existingWindow = windows.find(w => w.id === windowId);
    if (existingWindow) {
      // Window exists, check if it's in the same column
      if (existingWindow.column === column) {
        // Same column, remove it (toggle off)
        removeWindow(windowId);
      } else {
        // Different column, move it to the clicked column
        moveWindow(windowId, column);
      }
    } else {
      // Window doesn't exist, create and add it
      const windowData = createWindowData(windowId, column);
      if (windowData) {
        addWindow(windowData);
      }
    }
  }, [windows, addWindow, removeWindow, moveWindow, createWindowData]);

  // Memoized window filtering for better performance
  const windowGroups = useMemo(() => {
    const leftWindows = windows.filter(w => w.column === COLUMN_TYPES.LEFT && !w.pinned)
      .sort((a, b) => a.order - b.order);
    const leftPinnedWindows = windows.filter(w => w.column === COLUMN_TYPES.LEFT && w.pinned)
      .sort((a, b) => a.order - b.order);
    const leftSubWindows = windows.filter(w => w.column === COLUMN_TYPES.LEFT_SUB && !w.pinned)
      .sort((a, b) => a.order - b.order);
    const leftSubPinnedWindows = windows.filter(w => w.column === COLUMN_TYPES.LEFT_SUB && w.pinned)
      .sort((a, b) => a.order - b.order);
    const rightWindows = windows.filter(w => w.column === COLUMN_TYPES.RIGHT && !w.pinned)
      .sort((a, b) => a.order - b.order);
    const rightPinnedWindows = windows.filter(w => w.column === COLUMN_TYPES.RIGHT && w.pinned)
      .sort((a, b) => a.order - b.order);
    const rightSubWindows = windows.filter(w => w.column === COLUMN_TYPES.RIGHT_SUB && !w.pinned)
      .sort((a, b) => a.order - b.order);
    const rightSubPinnedWindows = windows.filter(w => w.column === COLUMN_TYPES.RIGHT_SUB && w.pinned)
      .sort((a, b) => a.order - b.order);

    return {
      leftWindows,
      leftPinnedWindows,
      leftSubWindows,
      leftSubPinnedWindows,
      rightWindows,
      rightPinnedWindows,
      rightSubWindows,
      rightSubPinnedWindows,
    };
  }, [windows]);

  // Helper function to check if a column has auto-open enabled
  const isAutoOpenEnabled = useCallback((column: ColumnType) => autoOpenContainersColumn === column, [autoOpenContainersColumn]);

  // Column configuration for cleaner JSX
  const columnConfigs = useMemo(() => [
    {
      column: COLUMN_TYPES.LEFT,
      windows: windowGroups.leftWindows,
      pinnedWindows: windowGroups.leftPinnedWindows,
      showSubPanel: showLeftSubPanel,
      columnRef: leftColumnRef,
      hasSubPanel: true,
    },
    {
      column: COLUMN_TYPES.LEFT_SUB,
      windows: windowGroups.leftSubWindows,
      pinnedWindows: windowGroups.leftSubPinnedWindows,
      showSubPanel: undefined,
      columnRef: leftSubPanelRef,
      hasSubPanel: false,
      condition: showLeftSubPanel,
    },
    {
      column: COLUMN_TYPES.RIGHT_SUB,
      windows: windowGroups.rightSubWindows,
      pinnedWindows: windowGroups.rightSubPinnedWindows,
      showSubPanel: undefined,
      columnRef: rightSubPanelRef,
      hasSubPanel: false,
      condition: showRightSubPanel,
    },
    {
      column: COLUMN_TYPES.RIGHT,
      windows: windowGroups.rightWindows,
      pinnedWindows: windowGroups.rightPinnedWindows,
      showSubPanel: showRightSubPanel,
      columnRef: rightColumnRef,
      hasSubPanel: true,
    },
  ], [windowGroups, showLeftSubPanel, showRightSubPanel]);

  const contextValue: WindowManagerContextType = useMemo(() => ({
    addWindow,
    removeWindow,
    moveWindow,
    togglePin,
    windows
  }), [addWindow, removeWindow, moveWindow, togglePin, windows]);

  return (
    <WindowManagerContext.Provider value={contextValue}>
      <div className="window-manager">
        <div className="window-columns">
          {/* Left Panel Group */}
          <div className="window-panel-group window-panel-group-left">
            {columnConfigs.slice(0, 2).map((config) => (
              <WindowColumnRenderer
                key={config.column}
                config={config}
                autoOpenContainers={isAutoOpenEnabled(config.column)}
                draggedWindow={draggedWindow}
                onToggleWindow={toggleWindow}
                onToggleAutoOpenContainers={toggleAutoOpenContainers}
                onToggleSubPanel={toggleSubPanel}
                onWindowClose={handleWindowClose}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onTogglePin={togglePin}
                onColumnDrop={handleColumnDrop}
                onWindowDrop={handleWindowDrop}
                onDragOver={handleDragOver}
              />
            ))}
          </div>

          {/* Right Panel Group */}
          <div className="window-panel-group window-panel-group-right">
            {columnConfigs.slice(2, 4).map((config) => (
              <WindowColumnRenderer
                key={config.column}
                config={config}
                autoOpenContainers={isAutoOpenEnabled(config.column)}
                draggedWindow={draggedWindow}
                onToggleWindow={toggleWindow}
                onToggleAutoOpenContainers={toggleAutoOpenContainers}
                onToggleSubPanel={toggleSubPanel}
                onWindowClose={handleWindowClose}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onTogglePin={togglePin}
                onColumnDrop={handleColumnDrop}
                onWindowDrop={handleWindowDrop}
                onDragOver={handleDragOver}
              />
            ))}
          </div>
        </div>

        {children}
      </div>
    </WindowManagerContext.Provider>
  );
}

import React, { useState, useRef, useCallback, createContext, useContext, useEffect } from 'react';
import './styles/WindowManager.scss';
import { Window, EquipmentWindow, MinimapWindow, ContainerWindow } from './index';
import type GameClient from '../../../../core/gameclient';
import { ItemUsePacket } from '../../../../core/protocol';

export interface WindowData {
  id: string;
  title: string;
  component: React.ReactNode;
  column: 'left' | 'right' | 'left-sub' | 'right-sub';
  order: number;
  className?: string;
  pinned?: boolean;
}

export interface SerializableWindowData {
  id: string;
  title: string;
  column: 'left' | 'right' | 'left-sub' | 'right-sub';
  order: number;
  className?: string;
  pinned?: boolean;
}

interface WindowManagerContextType {
  addWindow: (windowData: WindowData) => void;
  removeWindow: (windowId: string) => void;
  moveWindow: (windowId: string, newColumn: 'left' | 'right' | 'left-sub' | 'right-sub') => void;
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

const WINDOW_STATE_KEY = 'tibia-window-state';

export default function WindowManager({ children, gc }: WindowManagerProps) {
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const [autoOpenContainersLeft, setAutoOpenContainersLeft] = useState<boolean>(false);
  const [autoOpenContainersRight, setAutoOpenContainersRight] = useState<boolean>(false);
  const [showLeftSubPanel, setShowLeftSubPanel] = useState<boolean>(false);
  const [showRightSubPanel, setShowRightSubPanel] = useState<boolean>(false);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const leftSubPanelRef = useRef<HTMLDivElement>(null);
  const rightSubPanelRef = useRef<HTMLDivElement>(null);

  // Load auto-open container settings and sub-panel settings from localStorage on mount
  useEffect(() => {
    try {
      const savedLeft = localStorage.getItem('tibia-auto-open-containers-left');
      const savedRight = localStorage.getItem('tibia-auto-open-containers-right');
      const savedLeftSubPanel = localStorage.getItem('tibia-show-left-sub-panel');
      const savedRightSubPanel = localStorage.getItem('tibia-show-right-sub-panel');
      
      if (savedLeft !== null) {
        setAutoOpenContainersLeft(JSON.parse(savedLeft));
      }
      if (savedRight !== null) {
        setAutoOpenContainersRight(JSON.parse(savedRight));
      }
      if (savedLeftSubPanel !== null) {
        setShowLeftSubPanel(JSON.parse(savedLeftSubPanel));
      }
      if (savedRightSubPanel !== null) {
        setShowRightSubPanel(JSON.parse(savedRightSubPanel));
      }
    } catch (error) {
      console.warn('Failed to load panel settings:', error);
    }
  }, []);

  // Save auto-open container settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tibia-auto-open-containers-left', JSON.stringify(autoOpenContainersLeft));
    } catch (error) {
      console.warn('Failed to save auto-open containers left setting:', error);
    }
  }, [autoOpenContainersLeft]);

  useEffect(() => {
    try {
      localStorage.setItem('tibia-auto-open-containers-right', JSON.stringify(autoOpenContainersRight));
    } catch (error) {
      console.warn('Failed to save auto-open containers right setting:', error);
    }
  }, [autoOpenContainersRight]);

  // Save sub-panel settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tibia-show-left-sub-panel', JSON.stringify(showLeftSubPanel));
    } catch (error) {
      console.warn('Failed to save left sub-panel setting:', error);
    }
  }, [showLeftSubPanel]);

  useEffect(() => {
    try {
      localStorage.setItem('tibia-show-right-sub-panel', JSON.stringify(showRightSubPanel));
    } catch (error) {
      console.warn('Failed to save right sub-panel setting:', error);
    }
  }, [showRightSubPanel]);

  // Function to open all available containers in the specified column
  const openAllContainers = useCallback((column: 'left' | 'right') => {
    if (!gc?.player) return;

    try {
      const equipmentContainer = gc.player.getContainer(0);
      if (!equipmentContainer) return;

      // Open backpack (slot 6)
      const backpackThing = { which: equipmentContainer, index: 6 } as any;
      window.gameClient.send(new ItemUsePacket(backpackThing));

      // Open other common container slots if they exist
      // You can add more container slots here as needed
      const containerSlots = [14]; // Add more slots as needed
      
      containerSlots.forEach(slotIndex => {
        const item = equipmentContainer.getSlotItem(slotIndex);
        if (item && item.isContainer && item.isContainer()) {
          const thing = { which: equipmentContainer, index: slotIndex } as any;
          window.gameClient.send(new ItemUsePacket(thing));
        }
      });
    } catch (e) {
      console.warn('Failed to open containers:', e);
    }
  }, [gc]);

  const toggleAutoOpenContainers = useCallback((column: 'left' | 'right') => {
    if (column === 'left') {
      setAutoOpenContainersLeft(prev => {
        const newValue = !prev;
        // If turning on auto-open, open all containers
        if (newValue) {
          setTimeout(() => openAllContainers('left'), 100);
        }
        return newValue;
      });
    } else {
      setAutoOpenContainersRight(prev => {
        const newValue = !prev;
        // If turning on auto-open, open all containers
        if (newValue) {
          setTimeout(() => openAllContainers('right'), 100);
        }
        return newValue;
      });
    }
  }, [openAllContainers]);

  const toggleSubPanel = useCallback((panel: 'left' | 'right') => {
    if (panel === 'left') {
      setShowLeftSubPanel(prev => !prev);
    } else {
      setShowRightSubPanel(prev => !prev);
    }
  }, []);

  // Effect to automatically open new containers when auto-open is enabled
  useEffect(() => {
    if (!gc?.player) return;

    const checkAndOpenNewContainers = () => {
      try {
        const equipmentContainer = gc.player!.getContainer(0);
        if (!equipmentContainer) return;

        // Check if auto-open is enabled for either column
        const shouldAutoOpen = autoOpenContainersLeft || autoOpenContainersRight;
        if (!shouldAutoOpen) return;

        // Check all equipment slots for containers that aren't already open
        const containerSlots = [6, 14]; // backpack and other container slots
        
        containerSlots.forEach(slotIndex => {
          const item = equipmentContainer.getSlotItem(slotIndex);
          if (item && item.isContainer && item.isContainer()) {
            // Check if this container is already open
            const isAlreadyOpen = windows.some(w => w.id.startsWith('container-'));
            
            if (!isAlreadyOpen) {
              const thing = { which: equipmentContainer, index: slotIndex } as any;
              window.gameClient.send(new ItemUsePacket(thing));
            }
          }
        });
      } catch (e) {
        console.warn('Failed to check for new containers:', e);
      }
    };

    // Check periodically for new containers
    const interval = setInterval(checkAndOpenNewContainers, 2000);

    return () => clearInterval(interval);
  }, [gc, autoOpenContainersLeft, autoOpenContainersRight, windows]);

  // Load window state from localStorage on mount
  useEffect(() => {
    if (!gc) return; // Wait for game client to be available
    
    try {
      const savedState = localStorage.getItem(WINDOW_STATE_KEY);
      if (savedState) {
        const parsedWindows: SerializableWindowData[] = JSON.parse(savedState);
        if (Array.isArray(parsedWindows)) {
          // Recreate windows with components (only equipment and minimap)
          const restoredWindows: WindowData[] = parsedWindows
            .filter(windowConfig => !windowConfig.id.startsWith('container-')) // Explicitly exclude containers
            .map(windowConfig => {
              let component: React.ReactNode;
              
              if (windowConfig.id === 'equipment') {
                component = <EquipmentWindow gc={gc} containerIndex={0} />;
              } else if (windowConfig.id === 'minimap') {
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
        .filter(window => !window.id.startsWith('container-'))
        .map(window => ({
          id: window.id,
          title: window.title,
          column: window.column,
          order: window.order,
          className: window.className,
          pinned: window.pinned
        }));
      
      localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(serializableWindows));
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

  const moveWindow = useCallback((windowId: string, newColumn: 'left' | 'right' | 'left-sub' | 'right-sub') => {
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
    if (windowId.startsWith('container-')) {
      const containerId = parseInt(windowId.replace('container-', ''));
      
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

  const handleColumnDrop = useCallback((e: React.DragEvent, column: 'left' | 'right' | 'left-sub' | 'right-sub') => {
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

  const toggleWindow = useCallback((windowId: string, column: 'left' | 'right' | 'left-sub' | 'right-sub') => {
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
      // Window doesn't exist, add it
      if (windowId === 'equipment' && gc) {
        addWindow({
          id: 'equipment',
          title: 'Equipment',
          component: <EquipmentWindow gc={gc} containerIndex={0} />,
          column,
          order: 0,
          className: 'equipment-window',
          pinned: false
        });
      } else if (windowId === 'minimap' && gc) {
        addWindow({
          id: 'minimap',
          title: 'Minimap',
          component: <MinimapWindow gc={gc} />,
          column,
          order: 0,
          className: 'minimap-window',
          pinned: false
        });
      }
    }
  }, [windows, addWindow, removeWindow, moveWindow, gc]);

  const leftWindows = windows.filter(w => w.column === 'left' && !w.pinned)
    .sort((a, b) => a.order - b.order);

  const leftPinnedWindows = windows.filter(w => w.column === 'left' && w.pinned)
    .sort((a, b) => a.order - b.order);

  const leftSubWindows = windows.filter(w => w.column === 'left-sub' && !w.pinned)
    .sort((a, b) => a.order - b.order);

  const leftSubPinnedWindows = windows.filter(w => w.column === 'left-sub' && w.pinned)
    .sort((a, b) => a.order - b.order);

  const rightWindows = windows.filter(w => w.column === 'right' && !w.pinned)
    .sort((a, b) => a.order - b.order);

  const rightPinnedWindows = windows.filter(w => w.column === 'right' && w.pinned)
    .sort((a, b) => a.order - b.order);

  const rightSubWindows = windows.filter(w => w.column === 'right-sub' && !w.pinned)
    .sort((a, b) => a.order - b.order);

  const rightSubPinnedWindows = windows.filter(w => w.column === 'right-sub' && w.pinned)
    .sort((a, b) => a.order - b.order);

  const contextValue: WindowManagerContextType = {
    addWindow,
    removeWindow,
    moveWindow,
    togglePin,
    windows
  };

  return (
    <WindowManagerContext.Provider value={contextValue}>
      <div className="window-manager">
        <div className="window-columns">
          {/* Left Panel Group */}
          <div className="window-panel-group window-panel-group-left">
            <div 
              className={`window-column window-column-left ${draggedWindow ? 'drag-active' : ''}`}
              ref={leftColumnRef}
              onDrop={(e) => handleColumnDrop(e, 'left')}
              onDragOver={handleDragOver}
            >
          {/* Left column header with icons */}
          <div className="window-column-header">
            <button 
              className={`window-icon ${(leftWindows.find(w => w.id === 'equipment') || leftPinnedWindows.find(w => w.id === 'equipment')) ? 'active' : ''}`}
              onClick={() => toggleWindow('equipment', 'left')}
              title="Equipment"
            >
              🧥
            </button>
            <button 
              className={`window-icon ${(leftWindows.find(w => w.id === 'minimap') || leftPinnedWindows.find(w => w.id === 'minimap')) ? 'active' : ''}`}
              onClick={() => toggleWindow('minimap', 'left')}
              title="Minimap"
            >
              🗺️
            </button>
            <button 
              className={`window-icon ${autoOpenContainersLeft ? 'active' : ''}`}
              onClick={() => toggleAutoOpenContainers('left')}
              title={autoOpenContainersLeft ? 'Auto-open containers: ON' : 'Auto-open containers: OFF'}
            >
              📦
            </button>
            <button 
              className={`window-icon ${showLeftSubPanel ? 'active' : ''}`}
              onClick={() => toggleSubPanel('left')}
              title={showLeftSubPanel ? 'Hide right sub-panel' : 'Show right sub-panel'}
            >
              ➡️
            </button>
          </div>
          
            <div className="window-group-top">
              {/* Unpinned windows */}
              {leftWindows.map((window) => (
                <Window
                  key={`${window.id}-unpinned`}
                  id={window.id}
                  title={window.title}
                  onClose={() => handleWindowClose(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
                  onDrop={(e) => handleWindowDrop(e, window.id)}
                  onDragOver={handleDragOver}
                  isDragging={draggedWindow === window.id}
                  isPinned={false}
                  className={window.className}
                >
                  {window.component}
                </Window>
              ))}
            </div>
            
            <div className="window-group-bottom">
              {/* Pinned windows at bottom */}
              {leftPinnedWindows.map((window) => (
                <Window
                  key={`${window.id}-pinned`}
                  id={window.id}
                  title={window.title}
                  onClose={() => handleWindowClose(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
                  onDrop={(e) => handleWindowDrop(e, window.id)}
                  onDragOver={handleDragOver}
                  isDragging={draggedWindow === window.id}
                  isPinned={true}
                  className={window.className}
                >
                  {window.component}
                </Window>
              ))}
            </div>
          </div>

          {/* Left Sub-Panel (appears to the right of left column) */}
          {showLeftSubPanel && (
            <div 
              className={`window-column window-column-left-sub ${draggedWindow ? 'drag-active' : ''}`}
              ref={leftSubPanelRef}
              onDrop={(e) => handleColumnDrop(e, 'left-sub')}
              onDragOver={handleDragOver}
            >
              {/* Left Sub-Panel header with icons */}
              <div className="window-column-header">
                <button 
                  className={`window-icon ${(leftSubWindows.find(w => w.id === 'equipment') || leftSubPinnedWindows.find(w => w.id === 'equipment')) ? 'active' : ''}`}
                  onClick={() => toggleWindow('equipment', 'left-sub')}
                  title="Equipment"
                >
                  🧥
                </button>
                <button 
                  className={`window-icon ${(leftSubWindows.find(w => w.id === 'minimap') || leftSubPinnedWindows.find(w => w.id === 'minimap')) ? 'active' : ''}`}
                  onClick={() => toggleWindow('minimap', 'left-sub')}
                  title="Minimap"
                >
                  🗺️
                </button>
              </div>
              
              <div className="window-group-top">
                {/* Unpinned windows */}
                {leftSubWindows.map((window) => (
                  <Window
                    key={`${window.id}-unpinned`}
                    id={window.id}
                    title={window.title}
                    onClose={() => handleWindowClose(window.id)}
                    onDragStart={() => handleDragStart(window.id)}
                    onDragEnd={handleDragEnd}
                    onPin={(pinned) => togglePin(window.id)}
                    onDrop={(e) => handleWindowDrop(e, window.id)}
                    onDragOver={handleDragOver}
                    isDragging={draggedWindow === window.id}
                    isPinned={false}
                    className={window.className}
                  >
                    {window.component}
                  </Window>
                ))}
              </div>
              
              <div className="window-group-bottom">
                {/* Pinned windows at bottom */}
                {leftSubPinnedWindows.map((window) => (
                  <Window
                    key={`${window.id}-pinned`}
                    id={window.id}
                    title={window.title}
                    onClose={() => handleWindowClose(window.id)}
                    onDragStart={() => handleDragStart(window.id)}
                    onDragEnd={handleDragEnd}
                    onPin={(pinned) => togglePin(window.id)}
                    onDrop={(e) => handleWindowDrop(e, window.id)}
                    onDragOver={handleDragOver}
                    isDragging={draggedWindow === window.id}
                    isPinned={true}
                    className={window.className}
                  >
                    {window.component}
                  </Window>
                ))}
              </div>
            </div>
          )}
          </div>

          {/* Right Panel Group */}
          <div className="window-panel-group window-panel-group-right">
            {/* Right Sub-Panel (appears to the left of right column) */}
            {showRightSubPanel && (
              <div 
                className={`window-column window-column-right-sub ${draggedWindow ? 'drag-active' : ''}`}
                ref={rightSubPanelRef}
                onDrop={(e) => handleColumnDrop(e, 'right-sub')}
                onDragOver={handleDragOver}
              >
                {/* Right Sub-Panel header with icons */}
                <div className="window-column-header">
                  <button 
                    className={`window-icon ${(rightSubWindows.find(w => w.id === 'equipment') || rightSubPinnedWindows.find(w => w.id === 'equipment')) ? 'active' : ''}`}
                    onClick={() => toggleWindow('equipment', 'right-sub')}
                    title="Equipment"
                  >
                    🧥
                  </button>
                  <button 
                    className={`window-icon ${(rightSubWindows.find(w => w.id === 'minimap') || rightSubPinnedWindows.find(w => w.id === 'minimap')) ? 'active' : ''}`}
                    onClick={() => toggleWindow('minimap', 'right-sub')}
                    title="Minimap"
                  >
                    🗺️
                  </button>
                </div>
                
                <div className="window-group-top">
                  {/* Unpinned windows */}
                  {rightSubWindows.map((window) => (
                    <Window
                      key={`${window.id}-unpinned`}
                      id={window.id}
                      title={window.title}
                      onClose={() => handleWindowClose(window.id)}
                      onDragStart={() => handleDragStart(window.id)}
                      onDragEnd={handleDragEnd}
                      onPin={(pinned) => togglePin(window.id)}
                      onDrop={(e) => handleWindowDrop(e, window.id)}
                      onDragOver={handleDragOver}
                      isDragging={draggedWindow === window.id}
                      isPinned={false}
                      className={window.className}
                    >
                      {window.component}
                    </Window>
                  ))}
                </div>
                
                <div className="window-group-bottom">
                  {/* Pinned windows at bottom */}
                  {rightSubPinnedWindows.map((window) => (
                    <Window
                      key={`${window.id}-pinned`}
                      id={window.id}
                      title={window.title}
                      onClose={() => handleWindowClose(window.id)}
                      onDragStart={() => handleDragStart(window.id)}
                      onDragEnd={handleDragEnd}
                      onPin={(pinned) => togglePin(window.id)}
                      onDrop={(e) => handleWindowDrop(e, window.id)}
                      onDragOver={handleDragOver}
                      isDragging={draggedWindow === window.id}
                      isPinned={true}
                      className={window.className}
                    >
                      {window.component}
                    </Window>
                  ))}
                </div>
              </div>
            )}

            <div 
              className={`window-column window-column-right ${draggedWindow ? 'drag-active' : ''}`}
              ref={rightColumnRef}
              onDrop={(e) => handleColumnDrop(e, 'right')}
              onDragOver={handleDragOver}
            >
            {/* Right column header with icons */}
            <div className="window-column-header">
              <button 
                className={`window-icon ${(rightWindows.find(w => w.id === 'equipment') || rightPinnedWindows.find(w => w.id === 'equipment')) ? 'active' : ''}`}
                onClick={() => toggleWindow('equipment', 'right')}
                title="Equipment"
              >
                🧥
              </button>
              <button 
                className={`window-icon ${(rightWindows.find(w => w.id === 'minimap') || rightPinnedWindows.find(w => w.id === 'minimap')) ? 'active' : ''}`}
                onClick={() => toggleWindow('minimap', 'right')}
                title="Minimap"
              >
                🗺️
              </button>
              <button 
                className={`window-icon ${autoOpenContainersRight ? 'active' : ''}`}
                onClick={() => toggleAutoOpenContainers('right')}
                title={autoOpenContainersRight ? 'Auto-open containers: ON' : 'Auto-open containers: OFF'}
              >
                📦
              </button>
              <button 
                className={`window-icon ${showRightSubPanel ? 'active' : ''}`}
                onClick={() => toggleSubPanel('right')}
                title={showRightSubPanel ? 'Hide left sub-panel' : 'Show left sub-panel'}
              >
                ⬅️
              </button>
            </div>
            
            <div className="window-group-top">
              {/* Unpinned windows */}
              {rightWindows.map((window) => (
                <Window
                  key={`${window.id}-unpinned`}
                  id={window.id}
                  title={window.title}
                  onClose={() => handleWindowClose(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
                  onDrop={(e) => handleWindowDrop(e, window.id)}
                  onDragOver={handleDragOver}
                  isDragging={draggedWindow === window.id}
                  isPinned={false}
                  className={window.className}
                >
                  {window.component}
                </Window>
              ))}
            </div>
            
            <div className="window-group-bottom">
              {/* Pinned windows at bottom */}
              {rightPinnedWindows.map((window) => (
                <Window
                  key={`${window.id}-pinned`}
                  id={window.id}
                  title={window.title}
                  onClose={() => handleWindowClose(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
                  onDrop={(e) => handleWindowDrop(e, window.id)}
                  onDragOver={handleDragOver}
                  isDragging={draggedWindow === window.id}
                  isPinned={true}
                  className={window.className}
                >
                  {window.component}
                </Window>
              ))}
            </div>
          </div>
          </div>
        </div>

        {children}
      </div>
    </WindowManagerContext.Provider>
  );
}

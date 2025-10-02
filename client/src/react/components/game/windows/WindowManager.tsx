import React, { useState, useRef, useCallback, createContext, useContext, useEffect } from 'react';
import './styles/WindowManager.scss';
import { Window, EquipmentWindow, MinimapWindow, ContainerWindow } from './index';
import type GameClient from '../../../../core/gameclient';
import { ItemUsePacket } from '../../../../core/protocol';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';

export interface WindowData {
  id: string;
  title: string;
  component: React.ReactNode;
  column: 'left' | 'right';
  order: number;
  className?: string;
  pinned?: boolean;
}

export interface SerializableWindowData {
  id: string;
  title: string;
  column: 'left' | 'right';
  order: number;
  className?: string;
  pinned?: boolean;
}

interface WindowManagerContextType {
  addWindow: (windowData: WindowData) => void;
  removeWindow: (windowId: string) => void;
  moveWindow: (windowId: string, newColumn: 'left' | 'right') => void;
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
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const { equipmentItems } = usePlayerEquipment(gc || null);
  const BACKPACK_SLOT_INDEX = 6; // matches legacy index for backpack-slot
  const equippedBackpack = equipmentItems?.[BACKPACK_SLOT_INDEX] || null;
  const [isBackpackOpen, setIsBackpackOpen] = useState<boolean>(false);

  // Track open/close of containers to know if the equipped backpack is open
  useEffect(() => {
    const updateBackpackOpenFromContainers = () => {
      try {
        const containers = window.gameClient?.player?.containers?.getAllContainers?.() || [];
        const open = !!(equippedBackpack && containers.find((c: any) => c?.id === equippedBackpack.id));
        setIsBackpackOpen(open);
      } catch (e) {
        // noop
      }
    };

    updateBackpackOpenFromContainers();

    const onOpen = () => updateBackpackOpenFromContainers();
    const onClose = () => updateBackpackOpenFromContainers();

    window.addEventListener('containerOpen', onOpen as EventListener);
    window.addEventListener('containerClose', onClose as EventListener);
    const interval = window.setInterval(updateBackpackOpenFromContainers, 1000);
    return () => {
      window.removeEventListener('containerOpen', onOpen as EventListener);
      window.removeEventListener('containerClose', onClose as EventListener);
      window.clearInterval(interval);
    };
  }, [equippedBackpack]);

  const handleToggleBackpack = useCallback(() => {
    if (!gc) return;
    // If no backpack equipped, do nothing
    if (!equippedBackpack) return;

    // If backpack container is currently open, close it
    if (isBackpackOpen) {
      try {
        const containers = window.gameClient?.player?.containers?.getAllContainers?.() || [];
        const bpContainer = containers.find((c: any) => c?.id === equippedBackpack.id);
        if (bpContainer) {
          window.gameClient.player!.closeContainer(bpContainer);
        }
      } catch (e) {
        // noop
      }
      return;
    }

    // Otherwise, open the backpack by using the item in equipment container slot
    try {
      const equipmentContainer = window.gameClient.player!.getContainer(0);
      if (!equipmentContainer) return;
      const thing = { which: equipmentContainer, index: BACKPACK_SLOT_INDEX } as any;
      window.gameClient.send(new ItemUsePacket(thing));
    } catch (e) {
      // noop
    }
  }, [gc, equippedBackpack, isBackpackOpen]);

  // Load window state from localStorage on mount
  useEffect(() => {
    if (!gc) return; // Wait for game client to be available
    
    try {
      const savedState = localStorage.getItem(WINDOW_STATE_KEY);
      if (savedState) {
        const parsedWindows: SerializableWindowData[] = JSON.parse(savedState);
        if (Array.isArray(parsedWindows)) {
          // Recreate windows with components
          const restoredWindows: WindowData[] = parsedWindows.map(windowConfig => {
            let component: React.ReactNode;
            
            if (windowConfig.id === 'equipment') {
              component = <EquipmentWindow gc={gc} containerIndex={0} />;
            } else if (windowConfig.id === 'minimap') {
              component = <MinimapWindow gc={gc} />;
            } else {
              component = null; // Unknown window type
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
      // Persist only non-container windows and the main backpack (container-3)
      const serializableWindows: SerializableWindowData[] = windows
        .filter(w => !w.id.startsWith('container-') || w.id === 'container-3')
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

  const moveWindow = useCallback((windowId: string, newColumn: 'left' | 'right') => {
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

  const handleDragEnd = useCallback(() => {
    setDraggedWindow(null);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, column: 'left' | 'right') => {
    console.log('Column drop:', column);
    e.preventDefault();
    const windowId = e.dataTransfer.getData('text/plain');
    console.log('Window ID from drop:', windowId);
    if (windowId) {
      moveWindow(windowId, column);
      setDraggedWindow(null);
    }
  }, [moveWindow]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const toggleWindow = useCallback((windowId: string, column: 'left' | 'right') => {
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

  const rightWindows = windows.filter(w => w.column === 'right' && !w.pinned)
    .sort((a, b) => a.order - b.order);

  const rightPinnedWindows = windows.filter(w => w.column === 'right' && w.pinned)
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
              className={`window-icon ${isBackpackOpen ? 'active' : ''} ${!equippedBackpack ? 'disabled' : ''}`}
              onClick={handleToggleBackpack}
              title={equippedBackpack ? (isBackpackOpen ? 'Close backpack' : 'Open backpack') : 'No backpack equipped'}
            >
              🎒
            </button>
          </div>
          
            <div className="window-group-top">
              {/* Unpinned windows */}
              {leftWindows.map((window) => (
                <Window
                  key={`${window.id}-unpinned`}
                  id={window.id}
                  title={window.title}
                  onClose={() => removeWindow(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
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
                  onClose={() => removeWindow(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
                  isDragging={draggedWindow === window.id}
                  isPinned={true}
                  className={window.className}
                >
                  {window.component}
                </Window>
              ))}
            </div>
          </div>

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
                className={`window-icon ${isBackpackOpen ? 'active' : ''} ${!equippedBackpack ? 'disabled' : ''}`}
                onClick={handleToggleBackpack}
                title={equippedBackpack ? (isBackpackOpen ? 'Close backpack' : 'Open backpack') : 'No backpack equipped'}
              >
                🎒
              </button>
            </div>
            
            <div className="window-group-top">
              {/* Unpinned windows */}
              {rightWindows.map((window) => (
                <Window
                  key={`${window.id}-unpinned`}
                  id={window.id}
                  title={window.title}
                  onClose={() => removeWindow(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
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
                  onClose={() => removeWindow(window.id)}
                  onDragStart={() => handleDragStart(window.id)}
                  onDragEnd={handleDragEnd}
                  onPin={(pinned) => togglePin(window.id)}
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

        {children}
      </div>
    </WindowManagerContext.Provider>
  );
}

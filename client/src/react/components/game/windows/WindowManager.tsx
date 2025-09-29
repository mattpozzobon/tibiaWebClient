import React, { useState, useRef, useCallback, createContext, useContext } from 'react';
import './styles/WindowManager.scss';
import { Window, EquipmentWindow, MinimapWindow } from './index';
import type GameClient from '../../../../core/gameclient';

export interface WindowData {
  id: string;
  title: string;
  component: React.ReactNode;
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

export default function WindowManager({ children, gc }: WindowManagerProps) {
  const [windows, setWindows] = useState<WindowData[]>([]);
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

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
      // Window exists, remove it
      removeWindow(windowId);
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
  }, [windows, addWindow, removeWindow, gc]);

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
              className={`window-icon ${leftWindows.find(w => w.id === 'equipment') ? 'active' : ''}`}
              onClick={() => toggleWindow('equipment', 'left')}
              title="Equipment"
            >
              🧥
            </button>
            <button 
              className={`window-icon ${leftWindows.find(w => w.id === 'minimap') ? 'active' : ''}`}
              onClick={() => toggleWindow('minimap', 'left')}
              title="Minimap"
            >
              🗺️
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
                className={`window-icon ${rightWindows.find(w => w.id === 'equipment') ? 'active' : ''}`}
                onClick={() => toggleWindow('equipment', 'right')}
                title="Equipment"
              >
                🧥
              </button>
              <button 
                className={`window-icon ${rightWindows.find(w => w.id === 'minimap') ? 'active' : ''}`}
                onClick={() => toggleWindow('minimap', 'right')}
                title="Minimap"
              >
                🗺️
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

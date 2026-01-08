import React, { useEffect, useCallback, useState } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow, ContainerWindow, StatusWindow } from './index';
import { LOCALSTORAGE_KEYS, WINDOW_TYPES, COLUMN_TYPES, type ColumnType } from './constants';
import type GameClient from '../../../../core/gameclient';
import { useGameClientInitialized } from '../../../hooks/useGameClientInitialized';
import { ItemUsePacket } from '../../../../core/protocol';

interface WindowInitializerProps {
  gc: GameClient;
}

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow, windows } = useWindowManager();
  const { isInitialized: isGameInitialized, hasEquipment } = useGameClientInitialized(gc);

  // Log when equipment is fully initialized
  useEffect(() => {
    if (hasEquipment && gc?.player?.equipment) {
      const equipmentContainer = window.gameClient.player!.getContainer(0);
      if (!equipmentContainer) return;
      const thing2 = { which: equipmentContainer, index: 14 } as any;
      window.gameClient.send(new ItemUsePacket(thing2));

      const thing = { which: equipmentContainer, index: 6 } as any;
      window.gameClient.send(new ItemUsePacket(thing));
    }
  }, [hasEquipment, gc]);

  useEffect(() => {
    // Wait a bit to ensure WindowManager has loaded saved state first
    const timer = setTimeout(() => {
      // Clean up existing windows to avoid duplicates
      removeWindow('equipment');
      removeWindow('minimap');
      removeWindow('status');

      // Helper function to get saved window state
      const getSavedWindowState = (windowId: string) => {
        try {
          const savedState = localStorage.getItem('tibia-window-state');
          if (savedState) {
            const parsed = JSON.parse(savedState);
            if (Array.isArray(parsed)) {
              return parsed.find((w: any) => w?.id === windowId);
            }
          }
        } catch (_) {}
        return null;
      };

      // Get saved state for equipment, minimap, and status windows
      const savedEquipment = getSavedWindowState('equipment');
      const savedMinimap = getSavedWindowState('minimap');
      const savedStatus = getSavedWindowState('status');

      // Add the equipment window with saved state or defaults
      addWindow({
        id: 'equipment',
        title: 'Equipment',
        component: <EquipmentWindow gc={gc} containerIndex={0} />,
        column: savedEquipment?.column || 'left',
        order: savedEquipment?.order || 0,
        className: savedEquipment?.className || 'equipment-window',
        pinned: savedEquipment?.pinned || false
      });

      // Add the minimap window with saved state or defaults
      addWindow({
        id: 'minimap',
        title: 'Minimap',
        component: <MinimapWindow gc={gc} />,
        column: savedMinimap?.column || 'right',
        order: savedMinimap?.order || 0,
        className: savedMinimap?.className || 'minimap-window',
        pinned: savedMinimap?.pinned || false
      });

      // Add the status window with saved state or defaults
      addWindow({
        id: 'status',
        title: 'Status',
        component: <StatusWindow gc={gc} />,
        column: savedStatus?.column || 'left',
        order: savedStatus?.order || 0,
        className: savedStatus?.className || 'status-window',
        pinned: savedStatus?.pinned || false
      });
    }, 100); // Small delay to let WindowManager load first

    return () => clearTimeout(timer);
  }, [gc, addWindow, removeWindow]);

  // Set up container event listeners
  useEffect(() => {
    // Listen for container open events
    const handleContainerOpen = (event: CustomEvent) => {
      // Only create container windows if game is fully initialized
      if (!isGameInitialized) return;
      
      const { containerId, title } = event.detail;
      const windowId = `container-${containerId}`;
      
      removeWindow(windowId);
      
      // Determine which column to open the container in based on auto-open settings
      let column: ColumnType = COLUMN_TYPES.RIGHT;
      
      // Check auto-open container settings
      try {
        const autoOpenColumn = localStorage.getItem(LOCALSTORAGE_KEYS.AUTO_OPEN_CONTAINERS_COLUMN);
        
        if (autoOpenColumn && Object.values(COLUMN_TYPES).includes(autoOpenColumn as ColumnType)) {
          column = autoOpenColumn as ColumnType;
        } else {
          // No auto-open toggle is active, use default behavior
          // Check if this is the backpack container and get its preferred column
          const isBackpackContainer = title === 'backpack' || 
            (gc?.player?.equipment?.slots?.[6]?.item && 
             gc.player.equipment.slots[6].item.id === containerId);
          
          if (isBackpackContainer) {
            const savedColumn = localStorage.getItem(LOCALSTORAGE_KEYS.BACKPACK_COLUMN) as 'left' | 'right';
            if (savedColumn === 'left' || savedColumn === 'right') {
              column = savedColumn;
              console.log('Opening backpack container in saved column:', column);
            }
          }
        }
      } catch (_) {
        // Use default 'right' if localStorage fails
      }
      
      // Calculate available space in the column
      const calculateAvailableSpace = (targetColumn: ColumnType): number => {
        const viewportHeight = window.innerHeight;
        const columnPadding = 3 + 12; // top padding + bottom padding
        const headerHeight = 12; // window header height
        
        // Get all windows in the target column
        const columnWindows = windows.filter(w => w.column === targetColumn);
        
        // Calculate total height of existing windows
        let totalWindowHeight = 0;
        columnWindows.forEach(w => {
          if (w.height) {
            totalWindowHeight += w.height;
          } else {
            // Default heights for different window types
            if (w.className === 'container-window') {
              totalWindowHeight += 200; // Default container height
            } else if (w.className === 'minimap-window') {
              totalWindowHeight += 225;
            } else if (w.className === 'equipment-window') {
              totalWindowHeight += 150;
            } else {
              totalWindowHeight += 200; // Default
            }
          }
        });
        
        // Available space = viewport height - column padding - existing windows
        const availableSpace = viewportHeight - columnPadding - totalWindowHeight;
        return Math.max(100, availableSpace); // Minimum 100px
      };
      
      const availableSpace = calculateAvailableSpace(column);
      const defaultContainerHeight = 300; // Default container window height
      const containerHeight = availableSpace < defaultContainerHeight ? availableSpace : undefined;
      
      addWindow({
        id: windowId,
        title: title,
        component: <ContainerWindow gc={gc} containerId={containerId} />,
        column: column,
        order: 0,
        className: 'container-window',
        height: containerHeight
      });
    };

    // Listen for container close events
    const handleContainerClose = (event: CustomEvent) => {
      const { containerId } = event.detail;
      removeWindow(`container-${containerId}`);
    };

    window.addEventListener('containerOpen', handleContainerOpen as EventListener);
    window.addEventListener('containerClose', handleContainerClose as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('containerOpen', handleContainerOpen as EventListener);
      window.removeEventListener('containerClose', handleContainerClose as EventListener);
    };
  }, [gc, addWindow, removeWindow, isGameInitialized]);

  return null;
}

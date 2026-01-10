import React, { useEffect, useCallback, useState } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow, ContainerWindow, StatusWindow, FriendsWindow } from './index';
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

  // Note: WindowManager already handles restoring windows from localStorage
  // We don't need to auto-open windows here - they will be restored by WindowManager
  // if they were saved as open. If they were closed, they won't be in saved state.

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
      
      addWindow({
        id: windowId,
        title: title,
        component: <ContainerWindow gc={gc} containerId={containerId} />,
        column: column,
        order: 0,
        className: 'container-window'
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

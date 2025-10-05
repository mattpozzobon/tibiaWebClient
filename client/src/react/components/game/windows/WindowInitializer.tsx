import React, { useEffect, useCallback, useState } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow, ContainerWindow } from './index';
import type GameClient from '../../../../core/gameclient';
import { useGameClientInitialized } from '../../../hooks/useGameClientInitialized';

interface WindowInitializerProps {
  gc: GameClient;
}

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow } = useWindowManager();
  const { isInitialized: isGameInitialized } = useGameClientInitialized(gc);


  useEffect(() => {
    // Wait a bit to ensure WindowManager has loaded saved state first
    const timer = setTimeout(() => {
      // Clean up existing windows to avoid duplicates
      removeWindow('equipment');
      removeWindow('minimap');

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

      // Get saved state for equipment and minimap windows
      const savedEquipment = getSavedWindowState('equipment');
      const savedMinimap = getSavedWindowState('minimap');

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
      
      addWindow({
        id: windowId,
        title: title,
        component: <ContainerWindow gc={gc} containerId={containerId} />,
        column: 'right',
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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow, ContainerWindow } from './index';
import type GameClient from '../../../../core/gameclient';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';

interface WindowInitializerProps {
  gc: GameClient;
}

const BACKPACK_SLOT_INDEX = 6;
const BELT_SLOT_INDEX = 14;
// Equipment slot indices
const EQUIPMENT_SLOTS = {
  BACKPACK: 6,
  BELT: 14
} as const;

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow } = useWindowManager();
  const { equipmentItems } = usePlayerEquipment(gc || null);
  const [mainContainerIds, setMainContainerIds] = useState<{ backpack?: number; belt?: number }>({});

  // Memoized equipment items
  const equippedItems = useMemo(() => ({
    backpack: equipmentItems?.[BACKPACK_SLOT_INDEX] || null,
    belt: equipmentItems?.[BELT_SLOT_INDEX] || null
  }), [equipmentItems]);

  // Helper function to get saved column preference
  const getSavedColumn = useCallback((containerId: number): 'left' | 'right' => {
    try {
      // Try to determine if this is a backpack or belt container
      const isBackpack = mainContainerIds.backpack === containerId;
      const isBelt = mainContainerIds.belt === containerId;
      
      const key = isBackpack ? 'tibia-backpack-column' : isBelt ? 'tibia-belt-column' : 'tibia-container-column';
      const storedColumn = localStorage.getItem(key);
      if (storedColumn === 'left' || storedColumn === 'right') {
        return storedColumn;
      }
      
      // Fallback to saved window state
      const savedState = localStorage.getItem('tibia-window-state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed)) {
          const window = parsed.find((w: any) => w?.id === `container-${containerId}`);
          if (window?.column) return window.column;
        }
      }
    } catch (_) {}
    return 'right';
  }, [mainContainerIds]);


  // Helper function to identify main container IDs
  const identifyMainContainers = useCallback(() => {
    if (!gc?.player?.containers) return;
    
    const containers = gc.player.containers.getAllContainers();
    const newIds: { backpack?: number; belt?: number } = {};
    
    // Find backpack container by matching with equipped backpack
    if (equippedItems.backpack) {
      const backpackContainer = containers.find((c: any) => c?.id === equippedItems.backpack?.id);
      if (backpackContainer) {
        newIds.backpack = backpackContainer.__containerId;
      }
    }
    
    // Find belt container by matching with equipped belt
    if (equippedItems.belt) {
      const beltContainer = containers.find((c: any) => c?.id === equippedItems.belt?.id);
      if (beltContainer) {
        newIds.belt = beltContainer.__containerId;
      }
    }
    
    setMainContainerIds(newIds);
  }, [gc, equippedItems]);



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
  }, [gc, addWindow, removeWindow, getSavedColumn]);

  // Set up container event listeners
  useEffect(() => {
    // Listen for container open events
    const handleContainerOpen = (event: CustomEvent) => {
      const { containerId, title } = event.detail;
      const windowId = `container-${containerId}`;
      
      removeWindow(windowId);
      
      const targetColumn = getSavedColumn(containerId);
      
      addWindow({
        id: windowId,
        title: title,
        component: <ContainerWindow gc={gc} containerId={containerId} />,
        column: targetColumn,
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
  }, [gc, addWindow, removeWindow, getSavedColumn]);

  // Identify main containers when equipment changes
  useEffect(() => {
    identifyMainContainers();
  }, [identifyMainContainers]);

  return null;
}

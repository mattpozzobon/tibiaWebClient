import React, { useEffect, useState } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow, ContainerWindow } from './index';
import type GameClient from '../../../../core/gameclient';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';
import { ItemUsePacket } from '../../../../core/protocol';

interface WindowInitializerProps {
  gc: GameClient;
}

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow } = useWindowManager();
  const { equipmentItems } = usePlayerEquipment(gc || null);
  const BACKPACK_SLOT_INDEX = 6;
  const equippedBackpack = equipmentItems?.[BACKPACK_SLOT_INDEX] || null;
  const [attemptedBackpackAutoOpen, setAttemptedBackpackAutoOpen] = useState(false);

  useEffect(() => {
    // Clean up existing windows to avoid duplicates
    removeWindow('equipment');
    removeWindow('minimap');

    // Add the equipment window
    addWindow({
      id: 'equipment',
      title: 'Equipment',
      component: <EquipmentWindow gc={gc} containerIndex={0} />,
      column: 'left',
      order: 0,
      className: 'equipment-window'
    });

    // Add the minimap window
    addWindow({
      id: 'minimap',
      title: 'Minimap',
      component: <MinimapWindow gc={gc} />,
      column: 'right',
      order: 0,
      className: 'minimap-window'
    });

    // Listen for container open events
    const handleContainerOpen = (event: CustomEvent) => {
      const { containerId, title } = event.detail;
      const windowId = `container-${containerId}`;
      
      // Remove existing window if it exists
      removeWindow(windowId);
      
      // Add new container window
      addWindow({
        id: windowId,
        title: title,
        component: <ContainerWindow gc={gc} containerId={containerId} />,
        column: 'right', // Default to right column
        order: 0,
        className: 'container-window'
      });
    };

    // Listen for container close events
    const handleContainerClose = (event: CustomEvent) => {
      const { containerId } = event.detail;
      const windowId = `container-${containerId}`;
      removeWindow(windowId);
    };

    window.addEventListener('containerOpen', handleContainerOpen as EventListener);
    window.addEventListener('containerClose', handleContainerClose as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('containerOpen', handleContainerOpen as EventListener);
      window.removeEventListener('containerClose', handleContainerClose as EventListener);
    };
  }, [gc, addWindow, removeWindow]); // Include dependencies

  return null;
}

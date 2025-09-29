import React, { useEffect } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow } from './index';
import type GameClient from '../../../../core/gameclient';

interface WindowInitializerProps {
  gc: GameClient;
}

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow } = useWindowManager();

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
  }, []); // Run only once on mount

  return null;
}

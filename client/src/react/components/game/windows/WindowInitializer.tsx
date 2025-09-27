import React, { useEffect } from 'react';
import { useWindowManager, EquipmentWindow } from './index';
import type GameClient from '../../../../core/gameclient';

interface WindowInitializerProps {
  gc: GameClient;
}

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow } = useWindowManager();

  useEffect(() => {
    // Clean up any existing equipment window first
    removeWindow('equipment');
    
    // Add the equipment window
    addWindow({
      id: 'equipment',
      title: 'Equipment',
      component: <EquipmentWindow gc={gc} containerIndex={0} />,
      column: 'left',
      order: 0,
      className: 'equipment-window'
    });
  }, []); // Run only once on mount

  return null;
}

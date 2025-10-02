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
  const BELT_SLOT_INDEX = 14;
  const equippedBackpack = equipmentItems?.[BACKPACK_SLOT_INDEX] || null;
  const equippedBelt = equipmentItems?.[BELT_SLOT_INDEX] || null;
  const [attemptedBackpackAutoOpen, setAttemptedBackpackAutoOpen] = useState(false);
  const [attemptedBeltAutoOpen, setAttemptedBeltAutoOpen] = useState(false);
  const [isOpeningBackpack, setIsOpeningBackpack] = useState(false);
  const [isOpeningBelt, setIsOpeningBelt] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

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
      
      // Add new container window in the saved column (or default right)
      let targetColumn: 'left' | 'right' = 'right';
      if (containerId === 3) {
        // Check for stored column preference first, then saved state
        try {
          const storedColumn = localStorage.getItem('tibia-backpack-column');
          if (storedColumn === 'left' || storedColumn === 'right') {
            targetColumn = storedColumn;
          } else {
            // Fallback to saved window state column
            try {
              const savedState = localStorage.getItem('tibia-window-state');
              if (savedState) {
                const parsed = JSON.parse(savedState);
                if (Array.isArray(parsed)) {
                  const backpackWindow = parsed.find((w: any) => w && typeof w.id === 'string' && w.id === 'container-3');
                  if (backpackWindow && backpackWindow.column) {
                    targetColumn = backpackWindow.column;
                  }
                }
              }
            } catch (_) {}
          }
        } catch (_) {}
      }
      
      addWindow({
        id: windowId,
        title: title,
        component: <ContainerWindow gc={gc} containerId={containerId} />,
        column: targetColumn,
        order: 0,
        className: 'container-window'
      });

      // Track main backpack open state separately (id 3)
      if (containerId === 3) {
        try { localStorage.setItem('tibia-main-backpack-open', '1'); } catch (_) {}
      }
      
      // Track main belt open state separately (id 4)
      if (containerId === 4) {
        try { localStorage.setItem('tibia-main-belt-open', '1'); } catch (_) {}
      }
    };

    // Listen for container close events
    const handleContainerClose = (event: CustomEvent) => {
      const { containerId } = event.detail;
      const windowId = `container-${containerId}`;
      removeWindow(windowId);

      if (containerId === 3) {
        try { localStorage.setItem('tibia-main-backpack-open', '0'); } catch (_) {}
      }
      
      if (containerId === 4) {
        try { localStorage.setItem('tibia-main-belt-open', '0'); } catch (_) {}
      }
    };

    window.addEventListener('containerOpen', handleContainerOpen as EventListener);
    window.addEventListener('containerClose', handleContainerClose as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('containerOpen', handleContainerOpen as EventListener);
      window.removeEventListener('containerClose', handleContainerClose as EventListener);
    };
  }, [gc, addWindow, removeWindow]); // Include dependencies

  // Track connection status
  useEffect(() => {
    if (!gc) return;
    
    const checkConnection = () => {
      const gameClient = (window as any).gameClient;
      const connected = !!gameClient?.networkManager?.isConnected?.();
      setIsConnected(connected);
    };
    
    // Check immediately
    checkConnection();
    
    // Check periodically
    const interval = setInterval(checkConnection, 1000);
    
    return () => clearInterval(interval);
  }, [gc]);

  // Re-open the main backpack (container-3) after login if it was previously open
  useEffect(() => {
    if (!gc) return;
    if (attemptedBackpackAutoOpen) return;
    if (isOpeningBackpack) return;
    
    // Only run when connected to the game
    if (!isConnected) {
      return;
    }
    

    // Prefer durable flag; fallback to saved window state
    let shouldOpenBackpack = false;
    let savedColumn: 'left' | 'right' = 'right'; // default
    try {
      const flag = localStorage.getItem('tibia-main-backpack-open');
      if (flag === '1') shouldOpenBackpack = true;
    } catch (_) {}
    if (!shouldOpenBackpack) {
      try {
        const savedState = localStorage.getItem('tibia-window-state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (Array.isArray(parsed)) {
            // Check for GUID-based window ID (container-3)
            const backpackWindow = parsed.find((w: any) => {
              if (!w || typeof w.id !== 'string') return false;
              return w.id === 'container-3';
            });
            if (backpackWindow) {
              shouldOpenBackpack = true;
              savedColumn = backpackWindow.column || 'right';
            }
          }
        }
      } catch (_) {}
    }

    if (!shouldOpenBackpack) return;

    let cancelled = false;
    let attempts = 0;

    const tryOpen = () => {
      if (cancelled) return;
      attempts++;

      const gameClient = (window as any).gameClient;
      const isConnected = !!gameClient?.networkManager?.isConnected?.();
      const equipmentContainer = gameClient?.player?.getContainer?.(0);
      const containers = gameClient?.player?.containers?.getAllContainers?.() || [];
      const runtimeEquippedBackpack = gameClient?.player?.equipment?.slots?.[BACKPACK_SLOT_INDEX]?.item || equippedBackpack;
      const alreadyOpen = containers.some((c: any) => c?.id === 3); // Check for container with GUID 3 (main backpack)


      if (!runtimeEquippedBackpack || !isConnected || !equipmentContainer || alreadyOpen) {
        if (alreadyOpen || attempts > 100) {
          setAttemptedBackpackAutoOpen(true);
          clearInterval(timer);
        }
        return;
      }

      try {
        setIsOpeningBackpack(true);
        const thing = { which: equipmentContainer, index: BACKPACK_SLOT_INDEX } as any;
        gameClient.send(new ItemUsePacket(thing));
        
        // Reset the opening flag after a delay
        setTimeout(() => {
          setIsOpeningBackpack(false);
        }, 2000);
      } catch (error) {
        setIsOpeningBackpack(false);
      }
    };

    const timer = setInterval(tryOpen, 300);
    tryOpen();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [gc, equippedBackpack, attemptedBackpackAutoOpen, isOpeningBackpack, isConnected]);

  // Re-open the main belt (container-4) after login if it was previously open
  useEffect(() => {
    if (!gc) return;
    if (attemptedBeltAutoOpen) return;
    if (isOpeningBelt) return;
    
    // Only run when connected to the game
    if (!isConnected) {
      return;
    }
    

    // Prefer durable flag; fallback to saved window state
    let shouldOpenBelt = false;
    let savedColumn: 'left' | 'right' = 'right'; // default
    try {
      const flag = localStorage.getItem('tibia-main-belt-open');
      if (flag === '1') shouldOpenBelt = true;
    } catch (_) {}
    if (!shouldOpenBelt) {
      try {
        const savedState = localStorage.getItem('tibia-window-state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (Array.isArray(parsed)) {
            // Check for GUID-based window ID (container-4)
            const beltWindow = parsed.find((w: any) => {
              if (!w || typeof w.id !== 'string') return false;
              return w.id === 'container-4';
            });
            if (beltWindow) {
              shouldOpenBelt = true;
              savedColumn = beltWindow.column || 'right';
            }
          }
        }
      } catch (_) {}
    }

    if (!shouldOpenBelt) return;

    let cancelled = false;
    let attempts = 0;

    const tryOpen = () => {
      if (cancelled) return;
      attempts++;

      const gameClient = (window as any).gameClient;
      const isConnected = !!gameClient?.networkManager?.isConnected?.();
      const equipmentContainer = gameClient?.player?.getContainer?.(0);
      const containers = gameClient?.player?.containers?.getAllContainers?.() || [];
      const runtimeEquippedBelt = gameClient?.player?.equipment?.slots?.[BELT_SLOT_INDEX]?.item || equippedBelt;
      const alreadyOpen = containers.some((c: any) => c?.id === 4); // Check for container with GUID 4 (main belt)


      if (!runtimeEquippedBelt || !isConnected || !equipmentContainer || alreadyOpen) {
        if (alreadyOpen || attempts > 100) {
          setAttemptedBeltAutoOpen(true);
          clearInterval(timer);
        }
        return;
      }

      try {
        setIsOpeningBelt(true);
        const thing = { which: equipmentContainer, index: BELT_SLOT_INDEX } as any;
        gameClient.send(new ItemUsePacket(thing));
        
        // Reset the opening flag after a delay
        setTimeout(() => {
          setIsOpeningBelt(false);
        }, 2000);
      } catch (error) {
        setIsOpeningBelt(false);
      }
    };

    const timer = setInterval(tryOpen, 300);
    tryOpen();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [gc, equippedBelt, attemptedBeltAutoOpen, isOpeningBelt, isConnected]);

  return null;
}

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWindowManager, EquipmentWindow, MinimapWindow, ContainerWindow } from './index';
import type GameClient from '../../../../core/gameclient';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';
import { ItemUsePacket } from '../../../../core/protocol';

interface WindowInitializerProps {
  gc: GameClient;
}

const BACKPACK_SLOT_INDEX = 6;
const BELT_SLOT_INDEX = 14;
const CONTAINER_IDS = {
  BACKPACK: 3,
  BELT: 4
} as const;

export default function WindowInitializer({ gc }: WindowInitializerProps) {
  const { addWindow, removeWindow } = useWindowManager();
  const { equipmentItems } = usePlayerEquipment(gc || null);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedAutoOpen, setAttemptedAutoOpen] = useState<Set<number>>(new Set());
  const [isOpening, setIsOpening] = useState<Set<number>>(new Set());

  // Memoized equipment items
  const equippedItems = useMemo(() => ({
    backpack: equipmentItems?.[BACKPACK_SLOT_INDEX] || null,
    belt: equipmentItems?.[BELT_SLOT_INDEX] || null
  }), [equipmentItems]);

  // Helper function to get saved column preference
  const getSavedColumn = useCallback((containerId: number): 'left' | 'right' => {
    try {
      const key = containerId === CONTAINER_IDS.BACKPACK ? 'tibia-backpack-column' : 'tibia-belt-column';
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
  }, []);

  // Helper function to check if container should auto-open
  const shouldAutoOpen = useCallback((containerId: number): boolean => {
    try {
      const key = containerId === CONTAINER_IDS.BACKPACK ? 'tibia-main-backpack-open' : 'tibia-main-belt-open';
      const flag = localStorage.getItem(key);
      if (flag === '1') return true;
      
      // Fallback to saved window state
      const savedState = localStorage.getItem('tibia-window-state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed)) {
          return parsed.some((w: any) => w?.id === `container-${containerId}`);
        }
      }
    } catch (_) {}
    return false;
  }, []);

  // Helper function to set container open state
  const setContainerOpenState = useCallback((containerId: number, isOpen: boolean) => {
    try {
      const key = containerId === CONTAINER_IDS.BACKPACK ? 'tibia-main-backpack-open' : 'tibia-main-belt-open';
      localStorage.setItem(key, isOpen ? '1' : '0');
    } catch (_) {}
  }, []);

  // Auto-open logic for containers
  const createAutoOpenEffect = useCallback((containerId: number, slotIndex: number, itemKey: keyof typeof equippedItems) => {
    return () => {
      if (!gc || attemptedAutoOpen.has(containerId) || isOpening.has(containerId) || !isConnected) {
        return;
      }

      if (!shouldAutoOpen(containerId)) return;

      let cancelled = false;
      let attempts = 0;

      const tryOpen = () => {
        if (cancelled) return;
        attempts++;

        const gameClient = (window as any).gameClient;
        const isConnected = !!gameClient?.networkManager?.isConnected?.();
        const equipmentContainer = gameClient?.player?.getContainer?.(0);
        const containers = gameClient?.player?.containers?.getAllContainers?.() || [];
        const runtimeEquippedItem = gameClient?.player?.equipment?.slots?.[slotIndex]?.item || equippedItems[itemKey];
        const alreadyOpen = containers.some((c: any) => c?.id === containerId);

        if (!runtimeEquippedItem || !isConnected || !equipmentContainer || alreadyOpen) {
          if (alreadyOpen || attempts > 100) {
            setAttemptedAutoOpen(prev => new Set(prev).add(containerId));
            clearInterval(timer);
          }
          return;
        }

        try {
          setIsOpening(prev => new Set(prev).add(containerId));
          const thing = { which: equipmentContainer, index: slotIndex } as any;
          gameClient.send(new ItemUsePacket(thing));
          
          setTimeout(() => {
            setIsOpening(prev => {
              const newSet = new Set(prev);
              newSet.delete(containerId);
              return newSet;
            });
          }, 2000);
        } catch (error) {
          setIsOpening(prev => {
            const newSet = new Set(prev);
            newSet.delete(containerId);
            return newSet;
          });
        }
      };

      const timer = setInterval(tryOpen, 300);
      tryOpen();

      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    };
  }, [gc, attemptedAutoOpen, isOpening, isConnected, equippedItems, shouldAutoOpen]);

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

      setContainerOpenState(containerId, true);
    };

    // Listen for container close events
    const handleContainerClose = (event: CustomEvent) => {
      const { containerId } = event.detail;
      removeWindow(`container-${containerId}`);
      setContainerOpenState(containerId, false);
    };

    window.addEventListener('containerOpen', handleContainerOpen as EventListener);
    window.addEventListener('containerClose', handleContainerClose as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('containerOpen', handleContainerOpen as EventListener);
      window.removeEventListener('containerClose', handleContainerClose as EventListener);
    };
  }, [gc, addWindow, removeWindow, getSavedColumn, setContainerOpenState]);

  // Track connection status
  useEffect(() => {
    if (!gc) return;
    
    const checkConnection = () => {
      const gameClient = (window as any).gameClient;
      const connected = !!gameClient?.networkManager?.isConnected?.();
      setIsConnected(connected);
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [gc]);

  // Auto-open effects for backpack and belt
  useEffect(() => {
    const cleanup = createAutoOpenEffect(CONTAINER_IDS.BACKPACK, BACKPACK_SLOT_INDEX, 'backpack');
    return cleanup();
  }, [createAutoOpenEffect]);
  
  useEffect(() => {
    const cleanup = createAutoOpenEffect(CONTAINER_IDS.BELT, BELT_SLOT_INDEX, 'belt');
    return cleanup();
  }, [createAutoOpenEffect]);

  return null;
}

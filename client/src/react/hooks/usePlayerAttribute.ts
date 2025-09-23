import { useState, useEffect } from 'react';
import type GameClient from '../../core/gameclient';
import type ConditionManager from '../../game/condition';
import type { Vitals } from '../../game/player/vitals/vitals';
import type Skills from '../../game/player/skills/skills';
import type Position from '../../game/position';
import type Equipment from '../../game/player/equipment/equipment';
import type Item from '../../game/item';


export function usePlayerAttribute<T>(
  gameClient: GameClient | null, 
  attributePath: keyof NonNullable<GameClient['player']>
): T | null {
  const [attribute, setAttribute] = useState<T | null>(null);

  useEffect(() => {
    if (!gameClient) {
      setAttribute(null);
      return;
    }

    const updateAttribute = () => {
      if (gameClient.player && gameClient.player[attributePath]) {
        setAttribute(gameClient.player[attributePath] as T);
      } else {
        setAttribute(null);
      }
    };

    // Try to get the attribute immediately
    updateAttribute();

    // If not available, poll until it becomes available
    if (!attribute) {
      const pollInterval = setInterval(() => {
        if (gameClient.player && gameClient.player[attributePath]) {
          setAttribute(gameClient.player[attributePath] as T);
          clearInterval(pollInterval);
        }
      }, 100);

      return () => clearInterval(pollInterval);
    }
  }, [gameClient, attributePath]);

  return attribute;
}

export function usePlayerConditions(gameClient: GameClient | null): { conditions: ConditionManager | null; conditionIds: Set<number> } {
  const [conditionIds, setConditionIds] = useState<Set<number>>(new Set());
  const conditions = usePlayerAttribute<ConditionManager>(gameClient, 'conditions');

  useEffect(() => {
    if (!conditions) {
      setConditionIds(new Set());
      return;
    }

    const updateConditionIds = () => {
      // Get current condition IDs from the ConditionManager
      const currentIds = new Set<number>();
      // We need to access the private __conditions, but we can use the has() method
      for (let i = 0; i < 100; i++) { // Check common condition IDs
        if (conditions.has(i)) {
          currentIds.add(i);
        }
      }
      
      // Only update if the set actually changed
      setConditionIds(prevIds => {
        if (currentIds.size !== prevIds.size || 
            [...currentIds].some(id => !prevIds.has(id)) ||
            [...prevIds].some(id => !currentIds.has(id))) {
          return currentIds;
        }
        return prevIds;
      });
    };

    // Initial update
    updateConditionIds();

    // Poll for changes every 100ms
    const interval = setInterval(updateConditionIds, 100);

    return () => clearInterval(interval);
  }, [conditions]);

  return { conditions, conditionIds };
}

export function usePlayerVitals(gameClient: GameClient | null) {
  const vitals = usePlayerAttribute<Vitals>(gameClient, 'vitals');

  const [vitalValues, setVitalValues] = useState({
    health: 0, maxHealth: 0,
    mana: 0,   maxMana: 0,
    energy: 0, maxEnergy: 0,
    capacity: 0, maxCapacity: 0,
  });

  useEffect(() => {
    if (!vitals) {
      setVitalValues({
        health: 0, maxHealth: 0,
        mana: 0,   maxMana: 0,
        energy: 0, maxEnergy: 0,
        capacity: 0, maxCapacity: 0,
      });
      return;
    }

    // initial snapshot
    setVitalValues({
      health: vitals.state.health,
      maxHealth: vitals.state.maxHealth,
      mana: vitals.state.mana,
      maxMana: vitals.state.maxMana,
      energy: vitals.state.energy,
      maxEnergy: vitals.state.maxEnergy,
      capacity: vitals.state.capacity,
      maxCapacity: vitals.state.maxCapacity,
    });

    // subscribe to changes
    const s = vitals.state;
    const unsubs = [
      s.on('health',      (v: number) => setVitalValues(p => ({ ...p, health: v }))),
      s.on('maxHealth',   (v: number) => setVitalValues(p => ({ ...p, maxHealth: v }))),
      s.on('mana',        (v: number) => setVitalValues(p => ({ ...p, mana: v }))),
      s.on('maxMana',     (v: number) => setVitalValues(p => ({ ...p, maxMana: v }))),
      s.on('energy',      (v: number) => setVitalValues(p => ({ ...p, energy: v }))),
      s.on('maxEnergy',   (v: number) => setVitalValues(p => ({ ...p, maxEnergy: v }))),
      s.on('capacity',    (v: number) => setVitalValues(p => ({ ...p, capacity: v }))),      // NEW
      s.on('maxCapacity', (v: number) => setVitalValues(p => ({ ...p, maxCapacity: v }))),   // NEW
    ];

    return () => unsubs.forEach(u => u && u());
  }, [vitals]);

  return { vitals, vitalValues };
}

export function usePlayerSkills(gameClient: GameClient | null): Skills | null {
  return usePlayerAttribute<Skills>(gameClient, 'skills');
}

export function usePlayer(gameClient: GameClient | null) {
  const [player, setPlayer] = useState<NonNullable<GameClient['player']> | null>(null);

  useEffect(() => {
    if (!gameClient) {
      setPlayer(null);
      return;
    }

    const updatePlayer = () => {
      if (gameClient.player) {
        setPlayer(gameClient.player);
      } else {
        setPlayer(null);
      }
    };

    // Try to get the player immediately
    updatePlayer();

    // If not available, poll until it becomes available
    const pollInterval = setInterval(() => {
      if (gameClient.player) {
        setPlayer(gameClient.player);
        clearInterval(pollInterval);
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, [gameClient]);

  return player;
}

export function usePlayerPosition(gameClient: GameClient | null) {
  const [playerPosition, setPlayerPosition] = useState<{ position: Position; floor: number } | null>(null);

  useEffect(() => {
    if (!gameClient || !gameClient.player) {
      setPlayerPosition(null);
      return;
    }

    const updatePosition = () => {
      if (gameClient.player) {
        const position = gameClient.player.getPosition();
        const floor = position.z;
        
        setPlayerPosition(prev => {
          // Only update if position actually changed
          if (!prev || 
              prev.position.x !== position.x || 
              prev.position.y !== position.y || 
              prev.position.z !== position.z) {
            return { position, floor };
          }
          return prev;
        });
      }
    };

    // Initial position
    updatePosition();

    // Listen for movement events for instant updates
    const handlePlayerMove = () => updatePosition();
    
    window.addEventListener('creatureMove', handlePlayerMove);
    window.addEventListener('creatureServerMove', handlePlayerMove);

    return () => {
      window.removeEventListener('creatureMove', handlePlayerMove);
      window.removeEventListener('creatureServerMove', handlePlayerMove);
    };
  }, [gameClient]);

  return playerPosition;
}

export function usePlayerEquipment(gameClient: GameClient | null): { 
  equipment: Equipment | null; 
  equipmentItems: (Item | null)[]; 
  forceRender: number;
} {
  const [equipmentItems, setEquipmentItems] = useState<(Item | null)[]>(new Array(10).fill(null));
  const [forceRender, setForceRender] = useState(0);
  const equipment = usePlayerAttribute<Equipment>(gameClient, 'equipment');

  useEffect(() => {
    if (!equipment) {
      setEquipmentItems(new Array(10).fill(null));
      return;
    }

    const updateEquipmentItems = () => {
      // Get current equipment items from all slots
      const currentItems = equipment.slots.map(slot => slot.item || null);
      
      // Only update if items actually changed
      setEquipmentItems(prevItems => {
        if (currentItems.length !== prevItems.length ||
            currentItems.some((item, index) => {
              const prevItem = prevItems[index];
              if (!item && !prevItem) return false; // both null
              if (!item || !prevItem) return true; // one null, one not
              return item.id !== prevItem.id || item.count !== prevItem.count;
            })) {
          return currentItems;
        }
        return prevItems;
      });
    };

    // Initial update
    updateEquipmentItems();

    // Listen to equipment events for instant updates
    const unsubscribeReady = equipment.onReady(() => {
      updateEquipmentItems();
      setForceRender(prev => prev + 1);
    });

    const unsubscribeChanged = equipment.onChanged(({ slot }) => {
      if (typeof slot === 'number') {
        // Update specific slot
        setEquipmentItems(prevItems => {
          const newItems = [...prevItems];
          newItems[slot] = equipment.slots[slot]?.item || null;
          return newItems;
        });
      } else {
        // Update all slots
        updateEquipmentItems();
      }
      setForceRender(prev => prev + 1);
    });

    return () => {
      unsubscribeReady();
      unsubscribeChanged();
    };
  }, [equipment]);

  return { equipment, equipmentItems, forceRender };
}
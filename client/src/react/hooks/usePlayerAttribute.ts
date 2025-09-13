import { useState, useEffect } from 'react';
import type GameClient from '../../core/gameclient';
import type ConditionManager from '../../game/condition';
import type { Vitals } from '../../game/player/vitals/vitals';
import type Skills from '../../game/player/skills/skills';

/**
 * Custom hook to safely access player attributes that may not be immediately available
 * 
 * @param gameClient - The game client instance
 * @param attributePath - The path to the player attribute (e.g., 'conditions', 'vitals', 'skills')
 * @returns The player attribute value, or null if not available
 */
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

/**
 * Specialized hook for player conditions that tracks condition changes
 */
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

/**
 * Specialized hook for player vitals that tracks vital changes
 */
export function usePlayerVitals(gameClient: GameClient | null): { vitals: Vitals | null; vitalValues: { health: number; maxHealth: number; mana: number; maxMana: number; energy: number; maxEnergy: number } } {
  const [vitalValues, setVitalValues] = useState({ health: 0, maxHealth: 0, mana: 0, maxMana: 0, energy: 0, maxEnergy: 0 });
  const vitals = usePlayerAttribute<Vitals>(gameClient, 'vitals');

  useEffect(() => {
    if (!vitals) {
      setVitalValues({ health: 0, maxHealth: 0, mana: 0, maxMana: 0, energy: 0, maxEnergy: 0 });
      return;
    }

    const updateVitalValues = () => {
      const current = {
        health: vitals.state.health,
        maxHealth: vitals.state.maxHealth,
        mana: vitals.state.mana,
        maxMana: vitals.state.maxMana,
        energy: vitals.state.energy,
        maxEnergy: vitals.state.maxEnergy
      };
      
      // Only update if values actually changed
      setVitalValues(prevValues => {
        if (current.health !== prevValues.health ||
            current.maxHealth !== prevValues.maxHealth ||
            current.mana !== prevValues.mana ||
            current.maxMana !== prevValues.maxMana ||
            current.energy !== prevValues.energy ||
            current.maxEnergy !== prevValues.maxEnergy) {
          return current;
        }
        return prevValues;
      });
    };

    // Initial update
    updateVitalValues();

    // Poll for changes every 100ms
    const interval = setInterval(updateVitalValues, 100);

    return () => clearInterval(interval);
  }, [vitals]);

  return { vitals, vitalValues };
}

/**
 * Specialized hook for player skills
 */
export function usePlayerSkills(gameClient: GameClient | null): Skills | null {
  return usePlayerAttribute<Skills>(gameClient, 'skills');
}

/**
 * Hook that waits for the entire player object to be available
 */
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
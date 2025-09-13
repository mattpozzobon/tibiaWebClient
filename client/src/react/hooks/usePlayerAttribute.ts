import { useEffect, useState } from 'react';
import type GameClient from '../../core/gameclient';

/**
 * Custom hook that waits for a player attribute to become available and returns it
 * @param gameClient - The game client instance
 * @param getAttribute - Function that extracts the attribute from the player
 * @param pollInterval - How often to check for the attribute (default: 100ms)
 * @returns The attribute value when available, null otherwise
 */
export function usePlayerAttribute<T>(
  gameClient: GameClient | null,
  getAttribute: (player: any) => T | null | undefined,
  pollInterval: number = 100
): T | null {
  const [attribute, setAttribute] = useState<T | null>(null);

  useEffect(() => {
    if (!gameClient) {
      setAttribute(null);
      return;
    }

    const checkAttribute = () => {
      if (gameClient?.player) {
        const value = getAttribute(gameClient.player);
        if (value !== null && value !== undefined) {
          setAttribute(value);
          return true; // Found it, stop polling
        }
      }
      return false; // Keep polling
    };

    // Try immediately
    if (checkAttribute()) {
      return;
    }

    // Poll until found
    const interval = setInterval(checkAttribute, pollInterval);

    return () => clearInterval(interval);
  }, [gameClient, getAttribute, pollInterval]);

  return attribute;
}

/**
 * Hook specifically for listening to player conditions
 */
export function usePlayerConditions(gameClient: GameClient | null) {
  return usePlayerAttribute(gameClient, (player) => player?.conditions);
}

/**
 * Hook specifically for listening to player vitals
 */
export function usePlayerVitals(gameClient: GameClient | null) {
  return usePlayerAttribute(gameClient, (player) => player?.vitals);
}

/**
 * Hook specifically for listening to player skills
 */
export function usePlayerSkills(gameClient: GameClient | null) {
  return usePlayerAttribute(gameClient, (player) => player?.skills);
}

/**
 * Hook specifically for listening to player equipment
 */
export function usePlayerEquipment(gameClient: GameClient | null) {
  return usePlayerAttribute(gameClient, (player) => player?.equipment);
}

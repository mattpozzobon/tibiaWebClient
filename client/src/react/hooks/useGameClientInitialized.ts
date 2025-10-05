import { useEffect, useState } from 'react';
import type GameClient from '../../core/gameclient';

type GameClientInitStatus = 'not-connected' | 'connecting' | 'connected' | 'player-loading' | 'fully-initialized';

export function useGameClientInitialized(gc: GameClient | null) {
  const [status, setStatus] = useState<GameClientInitStatus>('not-connected');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!gc) {
      setStatus('not-connected');
      setIsInitialized(false);
      return;
    }

    const checkInitialization = () => {
      // Check if game client is connected
      if (!gc.isConnected()) {
        setStatus('connecting');
        setIsInitialized(false);
        return false;
      }

      // Check if player is loaded
      if (!gc.player) {
        setStatus('connected');
        setIsInitialized(false);
        return false;
      }

      // Check if player equipment is loaded
      if (!gc.player.equipment) {
        setStatus('player-loading');
        setIsInitialized(false);
        return false;
      }

      // Check if player has vitals (health, mana, etc.)
      if (!gc.player.vitals) {
        setStatus('player-loading');
        setIsInitialized(false);
        return false;
      }

      // Game client is fully initialized
      setStatus('fully-initialized');
      setIsInitialized(true);
      return true;
    };

    // Check immediately
    if (checkInitialization()) {
      return;
    }

    // If not ready, poll every 100ms
    const interval = setInterval(() => {
      if (checkInitialization()) {
        clearInterval(interval);
      }
    }, 100);

    // Cleanup after 10 seconds to prevent infinite polling
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!isInitialized) {
        console.warn('Game client initialization timeout after 10 seconds');
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [gc, isInitialized]);

  return {
    status,
    isInitialized,
    isConnected: gc?.isConnected() || false,
    hasPlayer: !!gc?.player,
    hasEquipment: !!gc?.player?.equipment,
    hasVitals: !!gc?.player?.vitals,
  };
}

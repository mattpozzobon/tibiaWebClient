import React, { createContext, useContext, useEffect, useState } from 'react';
import GameClient from '../../core/gameclient';
import Player from '../../game/player/player';

type Ctx = GameClient | null;
const GameClientCtx = createContext<Ctx>(null);

type ProviderProps = React.PropsWithChildren<{ gc: GameClient | null }>;

export const GameClientProvider = ({ gc, children }: ProviderProps) => {
  return <GameClientCtx.Provider value={gc}>{children}</GameClientCtx.Provider>;
};

export function useGameClient() {
  return useContext(GameClientCtx);
}

// subscribe to player lifecycle via your emitter
export function usePlayer() {
  const gc = useGameClient();
  const [player, setPlayer] = useState<Player | null>(gc?.player ?? null);

  useEffect(() => {
    if (!gc) return;
    setPlayer(gc.player ?? null);

    // these assume you have an event emitter on gc
    const offReady = gc.events?.on?.('player:ready', setPlayer);
    const offUpdated = gc.events?.on?.('player:updated', setPlayer);

    return () => {
      offReady && offReady();
      offUpdated && offUpdated();
    };
  }, [gc]);

  return player;
}

// Hud.tsx
import React from 'react';
import TopbarIsland from './hud/TopbarIsland';
import Chat from './hud/Chat';
import StatusBar from './hud/StatusBar';
import PlayerBars from './hud/PlayerBars';
import Minimap from './hud/Minimap';
import { useGameClient } from '../../hooks/gameClientCtx';

const Hud: React.FC = () => {
  const gc = useGameClient();
  if (!gc) return null; // <- guard until GameClient exists

  return (
    <>
      <TopbarIsland gc={gc} />
      <PlayerBars gameClient={gc} />
      <Chat gc={gc} />
      <StatusBar gameClient={gc} />
      <Minimap gc={gc} />
    </>
  );
};

export default Hud;

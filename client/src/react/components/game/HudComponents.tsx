import React from 'react';
import TopbarIsland from './hud/TopbarIsland';
import Chat from './hud/Chat';
import BottomHudContainer from './hud/BottomHudContainer';
import { useGameClient } from '../../hooks/gameClientCtx';

const Hud: React.FC = () => {
  const gc = useGameClient();
  if (!gc) return null; // <- guard until GameClient exists

  return (
    <>
      <TopbarIsland gc={gc} />
      <Chat gc={gc} />
      <BottomHudContainer gameClient={gc} />
    </>
  );
};

export default Hud;

import React from 'react';
import type GameClient from '../../../core/gameclient';
import TopbarIsland from './hud/TopbarIsland';
import ChatWindowClean from './hud/ChatWindowClean';
import StatusBar from './hud/StatusBar';
import PlayerBars from './hud/PlayerBars';

interface HudProps {
  gameClient: GameClient;
}

const Hud: React.FC<HudProps> = ({ gameClient }) => {

  return (
    <>
      <TopbarIsland gc={gameClient} />
      <PlayerBars gameClient={gameClient} />
      <ChatWindowClean gc={gameClient} />
      <StatusBar gameClient={gameClient} />
    </>
  );
};

export default Hud;

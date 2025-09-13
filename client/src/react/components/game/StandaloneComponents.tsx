import React from 'react';
import type GameClient from '../../../core/gameclient';
import TopbarIsland from '../../TopbarIsland';
import ChatWindowClean from './ChatWindowClean';
import StatusBar from './StatusBar';
import PlayerBars from './PlayerBars';

interface StandaloneComponentsProps {
  gameClient: GameClient;
}

const StandaloneComponents: React.FC<StandaloneComponentsProps> = ({ gameClient }) => {

  return (
    <>
      <TopbarIsland gc={gameClient} />
      <PlayerBars gameClient={gameClient} />
      <ChatWindowClean gc={gameClient} />
      <StatusBar gameClient={gameClient} />
    </>
  );
};

export default StandaloneComponents;

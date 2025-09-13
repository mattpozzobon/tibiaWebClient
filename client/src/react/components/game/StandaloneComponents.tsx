import React from 'react';
import type GameClient from '../../../core/gameclient';
import TopbarIsland from '../../TopbarIsland';
import ChatWindowClean from './ChatWindowClean';
import StatusBar from './StatusBar';

interface StandaloneComponentsProps {
  gameClient: GameClient;
}

const StandaloneComponents: React.FC<StandaloneComponentsProps> = ({ gameClient }) => {

  return (
    <>
      
      {/* Topbar - Always at the top */}
      <div id="topbar-container" className="standalone-component">
        <TopbarIsland gc={gameClient} />
      </div>
      
      {/* Chat - Bottom left */}
      <div id="chat-container" className="standalone-component">
        <ChatWindowClean gc={gameClient} />
      </div>
      
      {/* Status Bar - Bottom center */}
      <StatusBar gameClient={gameClient} />
    </>
  );
};

export default StandaloneComponents;

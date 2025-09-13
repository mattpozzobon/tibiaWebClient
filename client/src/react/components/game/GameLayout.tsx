import React from 'react';
import type GameClient from '../../../core/gameclient';
import TopbarIsland from '../../TopbarIsland';
import ModalsWrapper from './ModalsWrapper';
import WindowsPrototypes from './WindowsPrototypes';
import AudioManager from './AudioManager';
import GameCanvas from './GameCanvas';
import GameUIManager from './GameUIManager';

interface GameLayoutProps {
  gameClient: GameClient | null;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameClient }) => {
  return (
    <div id="game-wrapper" className="game-wrapper">
      
      <AudioManager />
      <WindowsPrototypes />
      <ModalsWrapper />
 
      {gameClient && (
        <>
          {/* Topbar */}
          <div id="topbar-container">
            <TopbarIsland gc={gameClient} />
          </div>
          
          {/* Game UI */}
          <div id="game-ui-container">
            <GameUIManager gc={gameClient} />;
          </div>
        </>
      )}
      
      {/* Main Game Canvas */}
      <GameCanvas />
    </div>
  );
};

export default GameLayout;

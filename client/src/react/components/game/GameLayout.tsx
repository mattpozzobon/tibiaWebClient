import React from 'react';
import type GameClient from '../../../core/gameclient';
import TopbarIsland from '../../TopbarIsland';
import GameUI from './GameUI';
import ModalsWrapper from './ModalsWrapper';
import WindowsPrototypes from './WindowsPrototypes';
import AudioManager from './AudioManager';
import GameCanvas from './GameCanvas';

interface GameLayoutProps {
  gameClient: GameClient | null;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameClient }) => {
  return (
    <div id="game-wrapper" className="game-wrapper">
      {/* Audio Manager */}
      <AudioManager />
      
      {/* Windows and Prototypes */}
      <WindowsPrototypes />
      
      {/* Modals Wrapper */}
      <ModalsWrapper />
      
      {/* Game Client Dependent Components - only render when gameClient is available */}
      {gameClient && (
        <>
          {/* Topbar */}
          <div id="topbar-container">
            <TopbarIsland gc={gameClient} />
          </div>
          
          {/* Game UI */}
          <div id="game-ui-container">
            <GameUI gc={gameClient} />
          </div>
        </>
      )}
      
      {/* Main Game Canvas */}
      <GameCanvas />
    </div>
  );
};

export default GameLayout;

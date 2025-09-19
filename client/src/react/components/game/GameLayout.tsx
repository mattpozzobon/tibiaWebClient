import React, { useState, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
import AudioManager from './AudioManager';
import GameWindows from './GameWindows';
import { layoutManager, type LayoutManagerState } from '../../services/LayoutManager';
import './styles/GameLayout.scss';
import GameUIManager from './GameUIManager';
import Hud from './HudComponents';
import NotificationManager from './NotificationManager';

interface GameLayoutProps {
  gameClient: GameClient | null;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameClient }) => {
  const [layoutState, setLayoutState] = useState<LayoutManagerState>(layoutManager.getState());


  useEffect(() => {
    if (gameClient) {
      (window as any).gameLayoutManager = layoutManager;
    }
  }, [gameClient]);

  return (
    <>
      
      <AudioManager />
      <div id="game-container"></div>
      <div id="debug-statistics"></div>
      <NotificationManager />
      <div id="achievement" className="canvas-notification hidden"></div>

      {gameClient && (
        <>
          <Hud gameClient={gameClient} /> 
          <GameUIManager gc={gameClient} />
          {/* <Modals modals={layoutState.modals}onCloseModal={(id) => layoutManager.closeModal(id)}/> */}
          <GameWindows gameWindows={layoutState.gameWindows} onCloseWindow={(id) => layoutManager.removeGameWindow(id)}/> 
        </>
      )}
      
    </>
  );
};

export default GameLayout;

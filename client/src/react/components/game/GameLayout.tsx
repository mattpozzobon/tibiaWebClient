// GameLayout.tsx
import React from 'react';
import AudioManager from './AudioManager';
import './styles/GameLayout.scss';
import GameUIManager from './GameUIManager';
import Hud from './HudComponents';
import NotificationManager from './NotificationManager';
import { useGameClient } from '../../hooks/gameClientCtx';
import { WindowManager, WindowInitializer } from './windows';


const GameLayout: React.FC = () => {
  const gc = useGameClient(); // read the live GameClient

  return (
    <>
      <AudioManager />
      <div id="game-container"></div>
      <div id="debug-statistics"></div>
      <NotificationManager />
      <div id="achievement" className="canvas-notification hidden"></div>

      {gc && (
        <div className="game-layout">
          <div className="game-content">
            <Hud />
            <GameUIManager />
          </div>
          <WindowManager>
            <WindowInitializer gc={gc} />
          </WindowManager>
        </div>
      )}
    </>
  );
};

export default GameLayout;

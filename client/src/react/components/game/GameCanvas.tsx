import React from 'react';
import NotificationManager from './NotificationManager';
import './styles/GameCanvas.scss';

const GameCanvas: React.FC = () => {
  return (
    <>
  
        <div id="game-container"></div>
        <div id="debug-statistics"></div>
        <NotificationManager />
        <div id="achievement" className="canvas-notification hidden"></div>

    </>
  );
};

export default GameCanvas;

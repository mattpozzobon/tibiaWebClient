import React from 'react';
import NotificationManager from './NotificationManager';
import './styles/GameCanvas.scss';

const GameCanvas: React.FC = () => {
  return (
    <div className="main">
      <div className="upper">
        <div id="canvas-id" className="canvas-wrapper">
          <div id="game-container"></div>


          
          <div id="debug-statistics"></div>
          
          {/* React-based notification system */}
          <NotificationManager />
          
          <div id="achievement" className="canvas-notification hidden"></div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;

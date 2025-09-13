import React from 'react';
import './styles/GameCanvas.scss';

const GameCanvas: React.FC = () => {
  return (
    <div className="main">
      <div className="upper">
        <div id="canvas-id" className="canvas-wrapper">
          <div id="game-container"></div>

          <div id="text-wrapper" className="no-select">
            <span id="server-message"></span>
            <span id="zone-message"></span>
          </div>
          
          <div id="debug-statistics"></div>
          <div id="notification" className="canvas-notification"></div>
          <div id="achievement" className="canvas-notification hidden"></div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;

import React from 'react';
import StatusBar from './StatusBar';
import BeltHotbar from './BeltHotbar';
import type GameClient from '../../../../core/gameclient';
import './styles/BottomHudContainer.scss';

interface BottomHudContainerProps {
  gameClient: GameClient;
}

const BottomHudContainer: React.FC<BottomHudContainerProps> = ({ gameClient }) => {
  return (
    <div className="bottom-hud-container">
      <div className="bottom-hud-top-row">
        <BeltHotbar gc={gameClient} />
        <StatusBar gameClient={gameClient} />
      </div>
    </div>
  );
};

export default BottomHudContainer;

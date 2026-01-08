// PlayerBars.tsx
import React from 'react';
import type GameClient from '../../../../core/gameclient';
import { usePlayerVitals } from '../../../hooks/usePlayerAttribute';
import './styles/PlayerBars.scss';

interface PlayerBarsProps {
  gameClient: GameClient;
}

interface BarProps {
  current: number;
  max: number;
  color: string;
  lowColor?: string;
  icon?: string;
}

const Bar: React.FC<BarProps & { isCapacity?: boolean }> = ({ current, max, color, lowColor, icon, isCapacity }) => {
  const percentage = Math.min(max > 0 ? (current / max) * 100 : 0, 100);
  const isLow = percentage < 25;
  const barColor = isLow && lowColor ? lowColor : color;

  // Divide capacity by 100 for display
  const displayCurrent = isCapacity ? Math.round(current / 100) : current;
  const displayMax = isCapacity ? Math.round(max / 100) : max;

  // Format numbers with period as thousands separator if > 1000
  const formatNumber = (num: number): string => {
    if (num > 1000) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    return num.toString();
  };

  const formattedCurrent = isCapacity ? formatNumber(displayCurrent) : displayCurrent.toString();
  const formattedMax = isCapacity ? formatNumber(displayMax) : displayMax.toString();
  const suffix = isCapacity ? ' oz' : '';

  return (
    <div className="player-bar">
      <div className="bar-icon-wrap">{icon && <span className="bar-icon">{icon}</span>}</div>
      <div className="bar-container">
        <div
          className="bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: barColor, transition: 'width 0.3s ease, background-color 0.3s ease' }}
        />
        <div className="bar-value-overlay">{formattedCurrent}{suffix} / {formattedMax}{suffix}</div>
      </div>
    </div>
  );
};

const PlayerBars: React.FC<PlayerBarsProps> = ({ gameClient }) => {
  const { vitals, vitalValues } = usePlayerVitals(gameClient);

  if (!vitals) {
    return (
      <div id="player-bars" className="player-bars-container">
        <div className="loading">Loading player stats...</div>
      </div>
    );
  }

  return (
    <div id="player-bars" className="player-bars-container">
      <Bar current={vitalValues.health}  max={vitalValues.maxHealth}   color="#4CAF50" lowColor="#F44336" icon="❤️" />
      <Bar current={vitalValues.mana}    max={vitalValues.maxMana}     color="#2196F3" lowColor="#FF9800" icon="💙" />
      <Bar current={vitalValues.energy}  max={vitalValues.maxEnergy}   color="#9C27B0" lowColor="#FF5722" icon="⚡" />
      <Bar current={vitalValues.capacity} max={vitalValues.maxCapacity} color="#9E9E9E" lowColor="#FFC107" icon="🎒" isCapacity={true} />
    </div>
  );
};

export default PlayerBars;

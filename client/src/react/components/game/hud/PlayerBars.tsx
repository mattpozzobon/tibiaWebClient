// PlayerBars.tsx
import React from 'react';
import type GameClient from '../../../../core/gameclient';
import { usePlayerVitals } from '../../../hooks/usePlayerAttribute';
import './styles/PlayerBars.scss';

interface PlayerBarsProps {
  gameClient: GameClient;
}

interface BarProps {
  label: string;
  current: number;
  max: number;
  color: string;
  lowColor?: string;
  icon?: string;
}

const Bar: React.FC<BarProps> = ({ label, current, max, color, lowColor, icon }) => {
  const percentage = Math.min(max > 0 ? (current / max) * 100 : 0, 100);
  const isLow = percentage < 25;
  const barColor = isLow && lowColor ? lowColor : color;

  return (
    <div className="player-bar">
      <div className="bar-label">
        {icon && <span className="bar-icon">{icon}</span>}
        <span className="bar-text">{label}</span>
        <span className="bar-values">{current} / {max}</span>
      </div>
      <div className="bar-container">
        <div
          className="bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: barColor, transition: 'width 0.3s ease, background-color 0.3s ease' }}
        />
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
      <Bar label="Health"  current={vitalValues.health}  max={vitalValues.maxHealth}  color="#4CAF50" lowColor="#F44336" icon="❤️" />
      <Bar label="Mana"    current={vitalValues.mana}    max={vitalValues.maxMana}    color="#2196F3" lowColor="#FF9800" icon="💙" />
      <Bar label="Energy"  current={vitalValues.energy}  max={vitalValues.maxEnergy}  color="#9C27B0" lowColor="#FF5722" icon="⚡" />
      <Bar label="Capacity" current={vitalValues.capacity} max={vitalValues.maxCapacity} color="#9E9E9E" lowColor="#FFC107" icon="🎒" />
    </div>
  );
};

export default PlayerBars;

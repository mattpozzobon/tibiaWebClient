import React from 'react';
import type GameClient from '../../../../core/gameclient';
import { usePlayerVitals } from '../../../hooks/usePlayerAttribute';
import './styles/StatusPanel.scss';

interface StatusPanelProps {
  gc: GameClient;
}

interface BarProps {
  current: number;
  max: number;
  color: string;
  lowColor?: string;
  iconPath?: string;
}

const Bar: React.FC<BarProps & { isCapacity?: boolean }> = ({ current, max, color, lowColor, iconPath, isCapacity }) => {
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
    <div className="status-bar">
      {iconPath && (
        <div className="bar-icon-wrap">
          <img src={iconPath} alt="" />
        </div>
      )}
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

const StatusPanel: React.FC<StatusPanelProps> = ({ gc }) => {
  const { vitals, vitalValues } = usePlayerVitals(gc);

  if (!vitals) {
    return (
      <div className="status-loading">Loading player stats...</div>
    );
  }

  return (
    <>
      <Bar current={vitalValues.health}  max={vitalValues.maxHealth}   color="#4CAF50" lowColor="#F44336" iconPath="png/skills/max-health.png" />
      <Bar current={vitalValues.mana}    max={vitalValues.maxMana}     color="#2196F3" lowColor="#FF9800" iconPath="png/skills/max-mana.png" />
      <Bar current={vitalValues.energy}  max={vitalValues.maxEnergy}   color="#FFEB3B" lowColor="#FFC107" iconPath="png/skills/max-energy.png" />
    </>
  );
};

export default StatusPanel;

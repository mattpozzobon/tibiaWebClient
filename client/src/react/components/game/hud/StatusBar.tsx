import React, { useState, useEffect } from 'react';
import type GameClient from '../../../../core/gameclient';
import { usePlayerConditions } from '../../../hooks/usePlayerAttribute';
import './styles/StatusBar.scss';

interface StatusBarProps {
  gameClient: GameClient;
}

interface StatusCondition {
  id: number;
  title: string;
  src: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ gameClient }) => {
  const [conditions, setConditions] = useState<StatusCondition[]>([]);
  const { conditions: playerConditions, conditionIds } = usePlayerConditions(gameClient);
  
  const STATUS_CONDITIONS: Map<number, StatusCondition> = new Map([
    [0, { id: 0, title: "You are drunk.", src: "/png/status/status-drunk.png" }],
    [1, { id: 1, title: "You are poisoned.", src: "/png/status/status-poisoned.png" }],
    [2, { id: 2, title: "You are burning.", src: "/png/status/status-burning.png" }],
    [3, { id: 3, title: "You are electrified.", src: "/png/status/status-electrified.png" }],
    [4, { id: 4, title: "You are invisible.", src: "/png/status/status-invisible.png" }],
    [5, { id: 5, title: "You are in a protection zone.", src: "/png/status/status-protection-zone.png" }],
    [6, { id: 6, title: "You were recently in combat.", src: "/png/status/status-combat.png" }],
    [12, { id: 12, title: "You are wearing a magic shield.", src: "/png/status/status-magic-shield.png" }],
    [14, { id: 14, title: "You are hungry.", src: "/png/status/status-hungry.png" }],
    [15, { id: 15, title: "You are hasted.", src: "/png/status/status-haste.png" }],

    [16, { id: 16, title: "You are healing health.", src: "/png/status/healing.png" }],
    [17, { id: 17, title: "You are healing mana.", src: "/png/status/mana-healing.png" }],
    [18, { id: 18, title: "You are healing energy.", src: "/png/status/energy-healing.png" }],
  ]);

  // Update conditions when conditionIds change
  useEffect(() => {
    if (!conditionIds) {
      setConditions([]);
      return;
    }

    const activeConditions: StatusCondition[] = [];
    STATUS_CONDITIONS.forEach((condition, conditionId) => {
      if (conditionIds.has(conditionId)) {
        activeConditions.push(condition);
      }
    });
    setConditions(activeConditions);

  }, [conditionIds]);

  return (
    <div id="status-bar" className="status-bar">
        {conditions.map(condition => {
          return (
          <img
            key={condition.id}
            src={condition.src}
            title={condition.title}
            alt={condition.title}
            className="status-icon"
          />
        );
      })}
    </div>
  );
};

export default StatusBar;

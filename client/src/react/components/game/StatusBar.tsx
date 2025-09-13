import React, { useState, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
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
  ]);

  // Listen to condition events directly
  useEffect(() => {
    console.log('StatusBar: useEffect running, player:', !!gameClient?.player, 'conditions:', !!gameClient?.player?.conditions);
    
    const updateConditions = () => {
      if (!gameClient?.player) return;
      
      const activeConditions: StatusCondition[] = [];
      STATUS_CONDITIONS.forEach((condition, conditionId) => {
        if (gameClient.player?.hasCondition(conditionId)) {
          activeConditions.push(condition);
        }
      });
      console.log('StatusBar: Setting conditions:', activeConditions);
      setConditions(activeConditions);
    };

    // Always try to listen to events, even if player isn't ready yet
    const checkAndSubscribe = () => {
      if (gameClient?.player?.conditions) {
        console.log('StatusBar: Adding event listeners');
        gameClient.player.conditions.on('conditionAdded', updateConditions);
        gameClient.player.conditions.on('conditionRemoved', updateConditions);
        updateConditions();
        return true;
      }
      return false;
    };

    // Try to subscribe immediately
    if (!checkAndSubscribe()) {
      // If player not ready, poll every 100ms until it is
      const pollInterval = setInterval(() => {
        if (checkAndSubscribe()) {
          clearInterval(pollInterval);
        }
      }, 100);

      return () => clearInterval(pollInterval);
    }

    return () => {
      if (gameClient?.player?.conditions) {
        console.log('StatusBar: Removing event listeners');
        gameClient.player.conditions.off('conditionAdded', updateConditions);
        gameClient.player.conditions.off('conditionRemoved', updateConditions);
      }
    };
  }, [gameClient]);

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

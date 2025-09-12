import React, { useState } from 'react';
import type GameClient from '../../../core/gameclient';
import ChatWindow from './ChatWindow';
import InventoryPanel from './InventoryPanel';
import PlayerStats from './PlayerStats';

interface GameUIProps {
  gc: GameClient;
}

type UIPanel = 'chat' | 'inventory' | 'stats' | 'none';

export default function GameUI({ gc }: GameUIProps) {
  const [activePanel, setActivePanel] = useState<UIPanel>('none');

  const togglePanel = (panel: UIPanel) => {
    setActivePanel(activePanel === panel ? 'none' : panel);
  };

  return (
    <div className="game-ui">
      {/* UI Toggle Buttons */}
      <div className="ui-controls">
        <button 
          className={`ui-toggle-btn ${activePanel === 'chat' ? 'active' : ''}`}
          onClick={() => togglePanel('chat')}
          title="Toggle Chat (Ctrl+T)"
        >
          💬
        </button>
        <button 
          className={`ui-toggle-btn ${activePanel === 'inventory' ? 'active' : ''}`}
          onClick={() => togglePanel('inventory')}
          title="Toggle Inventory (Ctrl+I)"
        >
          🎒
        </button>
        <button 
          className={`ui-toggle-btn ${activePanel === 'stats' ? 'active' : ''}`}
          onClick={() => togglePanel('stats')}
          title="Toggle Stats (Ctrl+K)"
        >
          📊
        </button>
      </div>

      {/* Chat Panel */}
      {activePanel === 'chat' && (
        <div className="ui-panel chat-panel">
          <ChatWindow gc={gc} />
        </div>
      )}

      {/* Inventory Panel */}
      {activePanel === 'inventory' && (
        <div className="ui-panel inventory-panel">
          <InventoryPanel gc={gc} />
        </div>
      )}

      {/* Stats Panel */}
      {activePanel === 'stats' && (
        <div className="ui-panel stats-panel">
          <PlayerStats gc={gc} />
        </div>
      )}
    </div>
  );
}

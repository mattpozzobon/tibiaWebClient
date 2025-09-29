import React from 'react';
import Minimap from '../hud/Minimap';
import type GameClient from '../../../../core/gameclient';

interface MinimapWindowProps {
  gc: GameClient;
}

export default function MinimapWindow({ gc }: MinimapWindowProps) {
  return (
    <div className="minimap-window-content">
      <Minimap gc={gc} />
    </div>
  );
}



import React from 'react';
import type GameClient from '../../../core/gameclient';
import GameUIManager from './GameUIManager';

interface GameUIProps {
  gc: GameClient;
}

export default function GameUI({ gc }: GameUIProps) {
  return <GameUIManager gc={gc} />;
}

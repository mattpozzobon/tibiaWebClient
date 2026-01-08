import React from 'react';
import StatusPanel from '../hud/StatusPanel';
import type GameClient from '../../../../core/gameclient';

interface StatusWindowProps {
  gc: GameClient;
}

export default function StatusWindow({ gc }: StatusWindowProps) {
  return <StatusPanel gc={gc} />;
}

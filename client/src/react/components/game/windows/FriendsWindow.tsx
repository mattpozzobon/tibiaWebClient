import React from 'react';
import FriendsPanel from '../hud/FriendsPanel';
import type GameClient from '../../../../core/gameclient';

interface FriendsWindowProps {
  gc: GameClient;
}

export default function FriendsWindow({ gc }: FriendsWindowProps) {
  // Always render the panel - it will handle waiting for friendlist internally
  return <FriendsPanel gc={gc} />;
}

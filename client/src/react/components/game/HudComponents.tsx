import React from 'react';
import Chat from './hud/chat/Chat';
import BottomHudContainer from './hud/BottomHudContainer';
import LogoutIcon from './hud/icons/LogoutIcon';
import OutfitIcon from './hud/icons/OutfitIcon';
import FriendsIcon from './hud/icons/FriendsIcon';
import ChangelogIcon from './hud/icons/ChangelogIcon';
import { useGameClient } from '../../hooks/gameClientCtx';

const Hud: React.FC = () => {
  const gc = useGameClient();
  if (!gc) return null; // <- guard until GameClient exists

  return (
    <>
      <LogoutIcon gc={gc} />
      <OutfitIcon gc={gc} />
      <FriendsIcon gc={gc} />
      {/* <ChangelogIcon gc={gc} /> */}
      <Chat gc={gc} />
      <BottomHudContainer gameClient={gc} />
    </>
  );
};

export default Hud;

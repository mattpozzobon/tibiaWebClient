import React, { useState } from 'react';
import type GameClient from "../../../../core/gameclient";
import ChangelogModal from "../../ChangelogModal";
import OutfitModal from "../modals/OutfitModal";
import FriendModal from "../modals/FriendModal";
import './styles/TopbarIsland.scss';

interface TopbarIslandProps {
  gc: GameClient;
}

export default function TopbarIsland({ gc }: TopbarIslandProps) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [showOutfitModal, setShowOutfitModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    location.reload();
  };

  const handleSettings = () => {
    gc.interface?.modalManager?.open?.("settings");
  };

  const handleSkills = () => {
    gc.interface?.modalManager?.open?.("skills");
  };

  const handleBattle = () => {
    gc.interface?.modalManager?.open?.("battle");
  };

  const handleOutfit = () => {
    setShowOutfitModal(true);
  };

  const handleFriends = () => {
    setShowFriendModal(true);
  };

  const handleInventory = () => {
    gc.interface?.modalManager?.open?.("inventory");
  };

  const handleMap = () => {
    gc.interface?.modalManager?.open?.("map");
  };

  const handleChangelog = () => {
    setShowChangelog(true);
  };

  return (
    <div id="topbar-container" className="standalone-component">
    <div id="top-button-bar">
      <div className="icon-button" title="Logout (Ctrl+G)" onClick={handleLogout}>
        <img id="logoutButton" src="png/icons/logout.png" alt="Logout" />
        <span className="shortcut">Ctrl+G</span>
      </div>
      <div className="icon-button" title="Settings (Ctrl+O)" onClick={handleSettings}>
        <img id="openSettings" src="png/icons/config.png" alt="Settings" />
        <span className="shortcut">Ctrl+O</span>
      </div>
      <div className="icon-button" title="Stats (Ctrl+K)" onClick={handleSkills}>
        <img id="openSkills" src="png/icons/status.png" alt="Stats" />
        <span className="shortcut">Ctrl+K</span>
      </div>
      <div className="icon-button" title="Battle (Ctrl+B)" onClick={handleBattle}>
        <img id="openBattle" src="png/icons/battle.png" alt="Battle" />
        <span className="shortcut">Ctrl+B</span>
      </div>
      <div className="icon-button" title="Outfit (Ctrl+U)" onClick={handleOutfit}>
        <img id="openOutfit" src="png/icons/outfit.png" alt="Outfit" />
        <span className="shortcut">Ctrl+U</span>
      </div>
      <div className="icon-button" title="Friends (Ctrl+F)" onClick={handleFriends}>
        <img id="openFriends" src="png/icons/friends.png" alt="Friends" />
        <span className="shortcut">Ctrl+F</span>
      </div>
      <div className="icon-button" title="Inventory (Ctrl+I)" onClick={handleInventory}>
        <img id="openInventory" src="png/icons/inventory.png" alt="Inventory" />
        <span className="shortcut">Ctrl+I</span>
      </div>
      <div className="icon-button" title="Map (Ctrl+M)" onClick={handleMap}>
        <img id="openMap" src="png/icons/map.png" alt="Map" />
        <span className="shortcut">Ctrl+M</span>
      </div>
      <div className="icon-button" title="Changelog (Ctrl+N)" onClick={handleChangelog}>
        <span className="changelog-icon">📋</span>
        <span className="shortcut">Ctrl+N</span>
      </div>
    </div>
    
    <ChangelogModal 
      isVisible={showChangelog} 
      onClose={() => setShowChangelog(false)} 
    />
    
    <OutfitModal 
      isOpen={showOutfitModal} 
      onClose={() => setShowOutfitModal(false)} 
      gc={gc}
    />
    
    <FriendModal 
      isOpen={showFriendModal} 
      onClose={() => setShowFriendModal(false)} 
      gc={gc}
    />
    </div>
  );
}

import React from 'react';
import type GameClient from '../../../../../core/gameclient';
import '../styles/IconButton.scss';

interface LogoutIconProps {
  gc: GameClient;
}

export default function LogoutIcon({ gc }: LogoutIconProps) {
  const handleLogout = () => {
    // Destroy game client completely
    if (gc) {
      gc.destroy();
    }
    
    // Clear tokens
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
    
    // Clear login info
    if (gc?.interface?.loginFlowManager) {
      (gc.interface.loginFlowManager as any).clearLoginInfo?.();
    }
    
    // Trigger disconnect event to return to login
    window.dispatchEvent(new CustomEvent('game-disconnect', { 
      detail: { reason: 'User logged out' } 
    }));
  };

  return (
    <div className="logout-icon">
      <div className="icon-button" title="Logout (Ctrl+G)" onClick={handleLogout}>
        <img src="png/icons/logout.png" alt="Logout" />
      </div>
    </div>
  );
}

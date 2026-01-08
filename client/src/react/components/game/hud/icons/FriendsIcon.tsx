import React from 'react';
import '../styles/IconButton.scss';

interface FriendsIconProps {
  gc?: any;
}

export default function FriendsIcon({ gc }: FriendsIconProps) {
  const handleFriends = () => {
    (window as any).reactUIManager?.openModal('friends');
  };

  return (
    <div className="friends-icon">
      <div className="icon-button" title="Friends (Ctrl+F)" onClick={handleFriends}>
        <img src="png/icons/friends.png" alt="Friends" />
      </div>
    </div>
  );
}

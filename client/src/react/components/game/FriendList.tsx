import React, { useState, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
import './styles/FriendList.scss';

interface FriendListProps {
  gc: GameClient;
  onClose: () => void;
}

interface Friend {
  id: string;
  name: string;
  status: 'online' | 'offline';
  level?: number;
  vocation?: string;
}

export default function FriendList({ gc, onClose }: FriendListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showOffline, setShowOffline] = useState(false);
  const [sortBy, setSortBy] = useState<'normal' | 'reversed'>('normal');

  useEffect(() => {
    // Load friends from game client
    if (gc && gc.player && gc.player.friendlist) {
      // TODO: Implement when friendlist methods are available
      // For now, use mock data
      setFriends([
        { id: '1', name: 'TestFriend1', status: 'online', level: 25, vocation: 'Knight' },
        { id: '2', name: 'TestFriend2', status: 'offline', level: 30, vocation: 'Mage' }
      ]);
    }
  }, [gc]);

  const filteredFriends = friends.filter(friend => 
    showOffline || friend.status === 'online'
  ).sort((a, b) => {
    if (sortBy === 'reversed') {
      return b.name.localeCompare(a.name);
    }
    return a.name.localeCompare(b.name);
  });

  const handleAddFriend = () => {
    // Open enter name modal
    if ((window as any).reactUIManager) {
      (window as any).reactUIManager.openModal('enterName', {
        title: 'Add Friend',
        message: 'Enter the name of the player you want to add as a friend:',
        onConfirm: (name: string) => {
          // TODO: Implement when friendlist methods are available
          console.log('Adding friend:', name);
        }
      });
    }
  };

  const handleRemoveFriend = (friendName: string) => {
    if (confirm(`Remove ${friendName} from your friend list?`)) {
      // TODO: Implement when friendlist methods are available
      console.log('Removing friend:', friendName);
    }
  };

  const handleMessageFriend = (friendName: string) => {
    // TODO: Implement when chatManager is available
    console.log('Opening chat with:', friendName);
  };

  return (
    <div className="friend-list-panel">
      <div className="panel-header">
        <h3>Friends</h3>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="friend-controls">
          <button 
            className="btn-primary"
            onClick={handleAddFriend}
          >
            Add Friend
          </button>
          
          <div className="friend-filters">
            <button 
              className={`btn-secondary ${sortBy === 'normal' ? 'active' : ''}`}
              onClick={() => setSortBy('normal')}
            >
              Sort A-Z
            </button>
            <button 
              className={`btn-secondary ${sortBy === 'reversed' ? 'active' : ''}`}
              onClick={() => setSortBy('reversed')}
            >
              Sort Z-A
            </button>
            <button 
              className={`btn-secondary ${showOffline ? 'active' : ''}`}
              onClick={() => setShowOffline(!showOffline)}
            >
              {showOffline ? 'Hide Offline' : 'Show Offline'}
            </button>
          </div>
        </div>

        <div className="friends-list">
          {filteredFriends.length === 0 ? (
            <div className="no-friends">
              <p>No friends found.</p>
              <p>Add some friends to see them here!</p>
            </div>
          ) : (
            filteredFriends.map(friend => (
              <div key={friend.id} className={`friend-item ${friend.status}`}>
                <div className="friend-info">
                  <div className="friend-name">{friend.name}</div>
                  {friend.level && (
                    <div className="friend-details">
                      Level {friend.level} {friend.vocation}
                    </div>
                  )}
                </div>
                
                <div className="friend-status">
                  <span className={`status-indicator ${friend.status}`}>
                    {friend.status === 'online' ? '●' : '○'}
                  </span>
                  {friend.status}
                </div>
                
                <div className="friend-actions">
                  {friend.status === 'online' && (
                    <button 
                      className="btn-small"
                      onClick={() => handleMessageFriend(friend.name)}
                      title="Send Message"
                    >
                      💬
                    </button>
                  )}
                  <button 
                    className="btn-small btn-danger"
                    onClick={() => handleRemoveFriend(friend.name)}
                    title="Remove Friend"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

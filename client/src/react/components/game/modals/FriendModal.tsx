import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { FriendAddPacket, FriendRemovePacket } from '../../../../core/protocol';
import './styles/FriendModal.scss';

interface FriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

interface Friend {
  name: string;
  online: boolean;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  friendName: string;
}

export default function FriendModal({ isOpen, onClose, gc }: FriendModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriendName, setNewFriendName] = useState('');
  const [showOffline, setShowOffline] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, friendName: '' });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !gc.player) return;
    
    const friendList = gc.player.friendlist;
    if (friendList) {
      const friendsArray = Array.from(friendList['__friends'] || new Map(), ([name, online]) => ({ name, online }));
      setFriends(friendsArray);
    }
  }, [isOpen, gc.player]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.visible && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0, friendName: '' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu.visible]);

  const handleAddFriend = () => {
    if (!newFriendName.trim()) return;
    
    gc.send(new FriendAddPacket(newFriendName.trim()));
    setNewFriendName('');
  };

  const handleRemoveFriend = (friendName: string) => {
    if (window.confirm(`Are you sure you want to remove ${friendName} from your friend list?`)) {
      gc.send(new FriendRemovePacket(friendName));
    }
  };


  const handleFriendRightClick = (event: React.MouseEvent, friendName: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      friendName
    });
  };

  const handleContextMenuAction = (action: 'remove', friendName: string) => {
    if (action === 'remove') {
      handleRemoveFriend(friendName);
    }
    setContextMenu({ visible: false, x: 0, y: 0, friendName: '' });
  };

  const filteredFriends = friends.filter(friend => showOffline || friend.online);

  if (!isOpen || !gc.player) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="friend-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Friends</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="add-friend-section">
            <div className="add-friend-form">
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                placeholder="Enter friend's name..."
                maxLength={30}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
              />
              <button 
                className="add-friend-btn"
                onClick={handleAddFriend}
                disabled={!newFriendName.trim()}
              >
                Add Friend
              </button>
            </div>
          </div>

          <div className="friends-list">
            {filteredFriends.length === 0 ? (
              <div className="no-friends">No friends found</div>
            ) : (
              filteredFriends.map((friend) => (
                <div 
                  key={friend.name} 
                  className="friend-row"
                  onContextMenu={(e) => handleFriendRightClick(e, friend.name)}
                >
                  <span className={`friend-name ${friend.online ? 'online' : 'offline'}`}>
                    {friend.name}
                  </span>
                  <span className={`friend-status ${friend.online ? 'online' : 'offline'}`}>
                    {friend.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="friends-controls">
            <label className="show-offline-toggle">
              <input
                type="checkbox"
                checked={showOffline}
                onChange={(e) => setShowOffline(e.target.checked)}
              />
              Show Offline Friends
            </label>
          </div>

        </div>

        {contextMenu.visible && (
          <div 
            className="context-menu"
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 1000
            }}
          >
            <button 
              className="context-menu-item"
              onClick={() => handleContextMenuAction('remove', contextMenu.friendName)}
            >
              Remove Friend
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
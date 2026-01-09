import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { FriendAddPacket, FriendRemovePacket } from '../../../../core/protocol';
import BaseModal from '../../shared/BaseModal';
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
  friendOnline?: boolean;
}

const SHOW_OFFLINE_FRIENDS_KEY = 'showOfflineFriends';

export default function FriendModal({ isOpen, onClose, gc }: FriendModalProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [newFriendName, setNewFriendName] = useState('');
  // Load showOffline preference from localStorage, default to true
  const [showOffline, setShowOffline] = useState(() => {
    const saved = localStorage.getItem(SHOW_OFFLINE_FRIENDS_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
  const modalRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !gc.player) return;
    
    // Initialize friends list from the old friendlist system for now
    const friendList = gc.player.friendlist;
    if (friendList) {
      const friendsArray = Array.from(friendList['__friends'] || new Map(), ([name, online]) => ({ name, online }));
      setFriends(friendsArray);
    }

    // Initialize friend requests
    if (gc.player.friendlist) {
      setFriendRequests(gc.player.friendlist.getFriendRequests());
    }

    // Listen for friend status changes directly from packet handler
    const handlePlayerConnect = (event: CustomEvent) => {
      const { name } = event.detail;
      setFriends(prevFriends => 
        prevFriends.map(friend => 
          friend.name === name ? { ...friend, online: true } : friend
        )
      );
    };

    const handlePlayerDisconnect = (event: CustomEvent) => {
      const { name } = event.detail;
      setFriends(prevFriends => 
        prevFriends.map(friend => 
          friend.name === name ? { ...friend, online: false } : friend
        )
      );
    };

    const handleFriendsUpdate = (event: CustomEvent) => {
      const { friends, friendRequests } = event.detail;
      setFriends(friends);
      setFriendRequests(friendRequests);
    };

    window.addEventListener('playerConnect', handlePlayerConnect as EventListener);
    window.addEventListener('playerDisconnect', handlePlayerDisconnect as EventListener);
    window.addEventListener('friendsUpdate', handleFriendsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('playerConnect', handlePlayerConnect as EventListener);
      window.removeEventListener('playerDisconnect', handlePlayerDisconnect as EventListener);
      window.removeEventListener('friendsUpdate', handleFriendsUpdate as EventListener);
    };
  }, [isOpen, gc.player]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (contextMenu.visible) {
        const target = event.target as Node;
        if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
          setContextMenu({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
        }
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClick, true);
      return () => document.removeEventListener('click', handleClick, true);
    }
  }, [contextMenu.visible, isOpen]);

  const handleAddFriend = () => {
    if (!newFriendName.trim()) return;
    
    const friendName = newFriendName.trim();
    gc.send(new FriendAddPacket(friendName));
    setNewFriendName('');
    
    // Server will send FriendUpdatePacket to update the UI
  };

  const handleRemoveFriend = (friendName: string) => {
    if (window.confirm(`Are you sure you want to remove ${friendName} from your friend list?`)) {
      gc.send(new FriendRemovePacket(friendName));
      // Server will send FriendUpdatePacket to update the UI
    }
  };

  const handleAcceptFriendRequest = (requesterName: string) => {
    // Send accept packet to server
    gc.send(new FriendAddPacket(requesterName));
    // Server will send FriendUpdatePacket to update the UI
  };

  const handleDeclineFriendRequest = (requesterName: string) => {
    // Send decline packet to server
    gc.send(new FriendRemovePacket(requesterName));
    // Server will send FriendUpdatePacket to update the UI
  };

  const handleFriendRightClick = (event: React.MouseEvent, friendName: string) => {
    event.preventDefault();
    const friend = friends.find(f => f.name === friendName);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      friendName,
      friendOnline: friend?.online || false
    });
  };

  const handleMessageFriend = (friendName: string) => {
    const { reactChannelManager } = require('../../../services/ReactChannelManager');
    reactChannelManager.addPrivateChannel(friendName);
    const channels = reactChannelManager.getChannels();
    const privateChannelIndex = channels.findIndex((ch: any) => ch.name === friendName && ch.type === 'private');
    if (privateChannelIndex !== -1) {
      reactChannelManager.setActiveChannel(privateChannelIndex);
    }
    const chatWindow = (window as any).reactChatWindow;
    if (chatWindow) {
      chatWindow.setIsCollapsed(false);
      chatWindow.setIsActive(true);
      setTimeout(() => {
        const inputRef = chatWindow?.inputRef;
        if (inputRef?.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
    // Close the modal after opening the chat
    onClose();
  };

  const handleContextMenuAction = (action: 'message' | 'remove', friendName: string) => {
    if (action === 'message') {
      handleMessageFriend(friendName);
    } else if (action === 'remove') {
      handleRemoveFriend(friendName);
    }
    setContextMenu({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
  };

  const handleShowOfflineChange = (checked: boolean) => {
    setShowOffline(checked);
    localStorage.setItem(SHOW_OFFLINE_FRIENDS_KEY, checked.toString());
    // Dispatch custom event to notify other components (like FriendsPanel)
    window.dispatchEvent(new CustomEvent('showOfflineFriendsChanged', { detail: { showOffline: checked } }));
  };

  // Filter and sort friends: online first, then offline (if shown), alphabetically within each group
  const filteredFriends = friends
    .filter(friend => showOffline || friend.online)
    .sort((a, b) => {
      // Online friends first
      if (a.online !== b.online) {
        return a.online ? -1 : 1;
      }
      // Then sort alphabetically within each group
      return a.name.localeCompare(b.name);
    });

  if (!isOpen || !gc.player) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Friends"
      size="medium"
      className="friend-modal"
    >
      <div className="modal-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({friends.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({friendRequests.length})
        </button>
      </div>

      <div 
        className="modal-content"
        onClick={(e) => {
          if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
            setContextMenu({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
          }
        }}
      >
          {activeTab === 'friends' && (
            <>
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
                    onChange={(e) => handleShowOfflineChange(e.target.checked)}
                  />
                  Show Offline Friends
                </label>
              </div>
            </>
          )}

          {activeTab === 'requests' && (
            <div className="friend-requests-section">
              <div className="requests-list">
                {friendRequests.length === 0 ? (
                  <div className="no-requests">No friend requests</div>
                ) : (
                  friendRequests.map((requesterName) => (
                    <div key={requesterName} className="request-row">
                      <span className="requester-name">{requesterName}</span>
                      <div className="request-actions">
                        <button 
                          className="accept-btn"
                          onClick={() => handleAcceptFriendRequest(requesterName)}
                        >
                          Accept
                        </button>
                        <button 
                          className="decline-btn"
                          onClick={() => handleDeclineFriendRequest(requesterName)}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

      </div>

      {contextMenu.visible && (
        <div 
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
        >
          {contextMenu.friendOnline && (
            <button 
              className="context-menu-item"
              onClick={() => handleContextMenuAction('message', contextMenu.friendName)}
            >
              Message
            </button>
          )}
          <button 
            className="context-menu-item"
            onClick={() => handleContextMenuAction('remove', contextMenu.friendName)}
          >
            Remove Friend
          </button>
        </div>
      )}
    </BaseModal>
  );
}
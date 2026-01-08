import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type GameClient from '../../../../core/gameclient';
import { FriendRemovePacket } from '../../../../core/protocol';
import { reactChannelManager } from '../../../services/ReactChannelManager';
import './styles/FriendsPanel.scss';

interface FriendsPanelProps {
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

const FriendsPanel: React.FC<FriendsPanelProps> = ({ gc }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
  const panelRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      const { friends: updatedFriends } = event.detail;
      if (updatedFriends && Array.isArray(updatedFriends)) {
        setFriends([...updatedFriends]);
      }
    };

    window.addEventListener('playerConnect', handlePlayerConnect as EventListener);
    window.addEventListener('playerDisconnect', handlePlayerDisconnect as EventListener);
    window.addEventListener('friendsUpdate', handleFriendsUpdate as EventListener);

    return () => {
      window.removeEventListener('playerConnect', handlePlayerConnect as EventListener);
      window.removeEventListener('playerDisconnect', handlePlayerDisconnect as EventListener);
      window.removeEventListener('friendsUpdate', handleFriendsUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!gc || !gc.player || !gc.player.friendlist) {
      return;
    }

    const friendList = gc.player.friendlist as any;
    const friendsArray = Array.from(
      friendList['__friends'] || new Map(),
      ([name, online]: [string, boolean]) => ({ name, online })
    );
    
    if (friendsArray.length > 0) {
      setFriends(friendsArray);
    }
    
    setTimeout(() => {
      if (friendList && typeof friendList.updateDOM === 'function') {
        friendList.updateDOM();
      }
    }, 100);
  }, [gc, gc?.player, gc?.player?.friendlist]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (contextMenu.visible) {
        const target = event.target as Node;
        if (contextMenuRef.current && !contextMenuRef.current.contains(target)) {
          setContextMenu({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleRemoveFriend = (friendName: string) => {
    if (window.confirm(`Are you sure you want to remove ${friendName} from your friend list?`)) {
      gc.send(new FriendRemovePacket(friendName));
    }
  };

  const handleMessageFriend = (friendName: string) => {
    reactChannelManager.addPrivateChannel(friendName);
    const channels = reactChannelManager.getChannels();
    const privateChannelIndex = channels.findIndex(ch => ch.name === friendName && ch.type === 'private');
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
  };

  const handleFriendRightClick = (event: React.MouseEvent, friendName: string) => {
    event.preventDefault();
    event.stopPropagation();
    const friend = friends.find(f => f.name === friendName);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      friendName,
      friendOnline: friend?.online || false
    });
  };

  const handleContextMenuAction = (action: 'message' | 'remove' | 'add', friendName?: string) => {
    if (action === 'message' && friendName) {
      handleMessageFriend(friendName);
    } else if (action === 'remove' && friendName) {
      handleRemoveFriend(friendName);
    } else if (action === 'add') {
      (window as any).reactUIManager?.openModal('friends');
    }
    setContextMenu({ visible: false, x: 0, y: 0, friendName: '', friendOnline: false });
  };

  const filteredFriends = friends.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handlePanelRightClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.panel-friend-row')) {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        friendName: '',
        friendOnline: false
      });
    }
  };

  return (
    <div className="friends-panel" ref={panelRef} onContextMenu={handlePanelRightClick}>
      <div className="panel-friends-list">
        {filteredFriends.length === 0 ? (
          <div className="panel-no-friends">No friends found</div>
        ) : (
          filteredFriends.map((friend) => (
            <div 
              key={friend.name} 
              className="panel-friend-row"
              onContextMenu={(e) => handleFriendRightClick(e, friend.name)}
            >
              <span className={`panel-friend-name ${friend.online ? 'online' : 'offline'}`}>
                {friend.name}
              </span>
            </div>
          ))
        )}
      </div>

      {contextMenu.visible && createPortal(
        <div 
          ref={contextMenuRef}
          className="panel-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000
          }}
        >
          {contextMenu.friendName && (
            <>
              {contextMenu.friendOnline && (
                <button 
                  className="panel-context-menu-item"
                  onClick={() => handleContextMenuAction('message', contextMenu.friendName)}
                >
                  Message
                </button>
              )}
              <button 
                className="panel-context-menu-item"
                onClick={() => handleContextMenuAction('remove', contextMenu.friendName)}
              >
                Remove Friend
              </button>
            </>
          )}
          <button 
            className="panel-context-menu-item"
            onClick={() => handleContextMenuAction('add')}
          >
            Add Friend
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FriendsPanel;

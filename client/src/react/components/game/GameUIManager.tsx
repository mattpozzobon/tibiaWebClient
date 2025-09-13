import React, { useState, useEffect, useCallback } from 'react';
import type GameClient from '../../../core/gameclient';

// Import all game UI components
// import SettingsModal from './modals/SettingsModal';
// import SkillsModal from './modals/SkillsModal';
// import OutfitModal from './modals/OutfitModal';
// import MapModal from './modals/MapModal';
import ChatModal from './modals/ChatModal';
// import MoveItemModal from './modals/MoveItemModal';
// import ConfirmModal from './modals/ConfirmModal';
// import EnterNameModal from './modals/EnterNameModal';
// import ReadableModal from './modals/ReadableModal';
// import OfferModal from './modals/OfferModal';
// import SpellbookModal from './modals/SpellbookModal';

import ChatWindow from './ChatWindow';
// import FriendList from './FriendList';
// import Hotbar from './Hotbar';
// import PlayerStats from './PlayerStats';
// import InventoryPanel from './InventoryPanel';

interface GameUIManagerProps {
  gc: GameClient;
}

interface ModalState {
  isOpen: boolean;
  data?: any;
}

export default function GameUIManager({ gc }: GameUIManagerProps) {
  // Modal states
  const [modals, setModals] = useState<Record<string, ModalState>>({
    // settings: { isOpen: false },
    // skills: { isOpen: false },
    // outfit: { isOpen: false },
    // map: { isOpen: false },
    chat: { isOpen: false },
    // moveItem: { isOpen: false },
    // confirm: { isOpen: false },
    // enterName: { isOpen: false },
    // readable: { isOpen: false },
    // offer: { isOpen: false },
    // spellbook: { isOpen: false },
  });

  // UI element states
  const [showChat, setShowChat] = useState(true);
  // const [showInventory, setShowInventory] = useState(false);
  // const [showPlayerStats, setShowPlayerStats] = useState(false);
  // const [showFriendList, setShowFriendList] = useState(false);

  // Modal management functions
  const openModal = useCallback((modalName: string, data?: any) => {
    setModals(prev => ({
      ...prev,
      [modalName]: { isOpen: true, data }
    }));
  }, []);

  const closeModal = useCallback((modalName: string) => {
    setModals(prev => ({
      ...prev,
      [modalName]: { isOpen: false, data: undefined }
    }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(prev => {
      const newModals = { ...prev };
      Object.keys(newModals).forEach(key => {
        newModals[key] = { isOpen: false, data: undefined };
      });
      return newModals;
    });
  }, []);

  // UI toggle functions
  const toggleChat = useCallback(() => setShowChat(prev => !prev), []);
  // const toggleInventory = useCallback(() => setShowInventory(prev => !prev), []);
  // const togglePlayerStats = useCallback(() => setShowPlayerStats(prev => !prev), []);
  // const toggleFriendList = useCallback(() => setShowFriendList(prev => !prev), []);

  // Expose functions to global scope for compatibility with existing game code
  useEffect(() => {
    // Create a global UI manager for compatibility
    (window as any).reactUIManager = {
      openModal,
      closeModal,
      closeAllModals,
      toggleChat,
      // toggleInventory,
      // togglePlayerStats,
      // toggleFriendList,
    };

    // Listen for keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          // case 'o':
          //   event.preventDefault();
          //   openModal('settings');
          //   break;
          // case 'k':
          //   event.preventDefault();
          //   openModal('skills');
          //   break;
          // case 'u':
          //   event.preventDefault();
          //   openModal('outfit');
          //   break;
          // case 'm':
          //   event.preventDefault();
          //   openModal('map');
          //   break;
          // case 'f':
          //   event.preventDefault();
          //   toggleFriendList();
          //   break;
          // case 'i':
          //   event.preventDefault();
          //   toggleInventory();
          //   break;
          case 't':
            event.preventDefault();
            if (event.shiftKey) {
              openModal('chat');
            } else {
              toggleChat();
            }
            break;
          // case 'b':
          //   event.preventDefault();
          //   openModal('battle');
          //   break;
          // case 'n':
          //   event.preventDefault();
          //   openModal('changelog');
          //   break;
          case 'g':
            event.preventDefault();
            // Logout functionality
            localStorage.removeItem("auth_token");
            location.reload();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      delete (window as any).reactUIManager;
    };
  }, [openModal, closeModal, closeAllModals, toggleChat]);

  return (
    <div className="game-ui-manager">
      {/* Main UI Panels */}
      {showChat && (
        <ChatWindow 
          gc={gc}
        />
      )}
      
      {/* {showInventory && (
        <InventoryPanel 
          gc={gc}
          onClose={() => setShowInventory(false)}
        />
      )}
      
      {showPlayerStats && (
        <PlayerStats 
          gc={gc}
          onClose={() => setShowPlayerStats(false)}
        />
      )}
      
      {showFriendList && (
        <FriendList 
          gc={gc}
          onClose={() => setShowFriendList(false)}
        />
      )}

      {/* Hotbar - Always visible */}
      {/* <Hotbar gc={gc} /> */}

      {/* Modals */}
      {/* <SettingsModal 
        isOpen={modals.settings.isOpen}
        onClose={() => closeModal('settings')}
        gc={gc}
      />
      
      <SkillsModal 
        isOpen={modals.skills.isOpen}
        onClose={() => closeModal('skills')}
        gc={gc}
      />
      
      <OutfitModal 
        isOpen={modals.outfit.isOpen}
        onClose={() => closeModal('outfit')}
        gc={gc}
      />
      
      <MapModal 
        isOpen={modals.map.isOpen}
        onClose={() => closeModal('map')}
        gc={gc}
      /> */}
      
      <ChatModal 
        isOpen={modals.chat.isOpen}
        onClose={() => closeModal('chat')}
        gc={gc}
      />
      
      {/* <MoveItemModal 
        isOpen={modals.moveItem.isOpen}
        onClose={() => closeModal('moveItem')}
        gc={gc}
        data={modals.moveItem.data}
      />
      
      <ConfirmModal 
        isOpen={modals.confirm.isOpen}
        onClose={() => closeModal('confirm')}
        gc={gc}
        data={modals.confirm.data}
      />
      
      <EnterNameModal 
        isOpen={modals.enterName.isOpen}
        onClose={() => closeModal('enterName')}
        gc={gc}
        data={modals.enterName.data}
      />
      
      <ReadableModal 
        isOpen={modals.readable.isOpen}
        onClose={() => closeModal('readable')}
        gc={gc}
        data={modals.readable.data}
      />
      
      <OfferModal 
        isOpen={modals.offer.isOpen}
        onClose={() => closeModal('offer')}
        gc={gc}
        data={modals.offer.data}
      />
      
      <SpellbookModal 
        isOpen={modals.spellbook.isOpen}
        onClose={() => closeModal('spellbook')}
        gc={gc}
      /> */}
    </div>
  );
}

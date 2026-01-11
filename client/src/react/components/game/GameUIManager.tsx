import React, { useState, useEffect, useCallback, useRef } from 'react';
import type GameClient from '../../../core/gameclient';

// Import all game UI components
// import SettingsModal from './modals/SettingsModal';
// import SkillsModal from './modals/SkillsModal';
import OutfitModal from './modals/OutfitModal';
import FriendModal from './modals/FriendModal';
// import MapModal from './modals/MapModal';
import ChatModal from './modals/ChatModal';
import ChangelogModal from '../ChangelogModal';
import MoveItemModal from './modals/MoveItemModal';
// import ConfirmModal from './modals/ConfirmModal';
// import EnterNameModal from './modals/EnterNameModal';
import ReadableModal from './modals/ReadableModal';
import LetterModal from './modals/LetterModal';
import StampedLetterModal from './modals/StampedLetterModal';
import LabelModal from './modals/LabelModal';
// import OfferModal from './modals/OfferModal';
// import SpellbookModal from './modals/SpellbookModal';

import ConfirmModal from './modals/ConfirmModal';
import { useGameClient } from '../../hooks/gameClientCtx';
// import FriendList from './FriendList';
// import Hotbar from './Hotbar';
// import PlayerStats from './PlayerStats';
// import InventoryPanel from './InventoryPanel';


interface ModalState {
  isOpen: boolean;
  data?: any;
}

export default function GameUIManager() {
  const gc = useGameClient();
  if (!gc) return null;
  // Modal states
  const [modals, setModals] = useState<Record<string, ModalState>>({
    // settings: { isOpen: false },
    // skills: { isOpen: false },
    outfit: { isOpen: false },
    friends: { isOpen: false },
    changelog: { isOpen: false },
    // map: { isOpen: false },
    chat: { isOpen: false },
      moveItem: { isOpen: false },
      confirm: { isOpen: false },
      readable: { isOpen: false },
      letter: { isOpen: false },
      stampedLetter: { isOpen: false },
      label: { isOpen: false },
      // enterName: { isOpen: false },
      // offer: { isOpen: false },
      // spellbook: { isOpen: false },
  });

  // UI element states
  const [showChat, setShowChat] = useState(true);
  // const [showInventory, setShowInventory] = useState(false);
  // const [showPlayerStats, setShowPlayerStats] = useState(false);
  // const [showFriendList, setShowFriendList] = useState(false);

  // Use ref to track modals state for external access
  const modalsRef = useRef(modals);
  useEffect(() => {
    modalsRef.current = modals;
  }, [modals]);

  // Modal management functions
  const openModal = useCallback((modalName: string, data?: any) => {
    // Route letters, stamped letters, and labels to their respective modals instead of ReadableModal
    if (modalName === 'readable' && data?.name) {
      const normalizedName = data.name.toLowerCase();
      if (normalizedName === 'letter') {
        setModals(prev => ({
          ...prev,
          letter: { isOpen: true, data },
          readable: { isOpen: false, data: undefined } // Ensure readable is closed
        }));
        return;
      }
      // Check for stamped letter variations
      if (normalizedName === 'stamped letter' || normalizedName === 'stampedletter') {
        setModals(prev => ({
          ...prev,
          stampedLetter: { isOpen: true, data },
          readable: { isOpen: false, data: undefined } // Ensure readable is closed
        }));
        return;
      }
      // Check for label
      if (normalizedName === 'label') {
        setModals(prev => ({
          ...prev,
          label: { isOpen: true, data },
          readable: { isOpen: false, data: undefined } // Ensure readable is closed
        }));
        return;
      }
    }
    
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

  // Check if any modal is open - use ref to always get current state
  const isAnyModalOpen = useCallback(() => {
    return Object.values(modalsRef.current).some(modal => modal.isOpen);
  }, []);

  // Expose functions to global scope for compatibility with existing game code
  useEffect(() => {
    // Create a global UI manager for compatibility
    (window as any).reactUIManager = {
      openModal,
      closeModal,
      closeAllModals,
      toggleChat,
      isAnyModalOpen,
      // toggleInventory,
      // togglePlayerStats,
      // toggleFriendList,
      inventory: {
        slots: new Map<string, any>(),
        registerSlot(key: string, api: any) { this.slots.set(key, api); },
        unregisterSlot(key: string) { this.slots.delete(key); },
        getSlot(key: string) { return this.slots.get(key); }
      }
    };

  }, [openModal, closeModal, closeAllModals, toggleChat, isAnyModalOpen]);

  return (
    <div className="game-ui-manager">
      
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
      /> */}
      
      <OutfitModal 
        isOpen={modals.outfit.isOpen}
        onClose={() => closeModal('outfit')}
        gc={gc}
      />
      
      <FriendModal 
        isOpen={modals.friends.isOpen}
        onClose={() => closeModal('friends')}
        gc={gc}
      />
      
      <ChangelogModal 
        isVisible={modals.changelog.isOpen}
        onClose={() => closeModal('changelog')}
      />
      
      {/* <MapModal 
        isOpen={modals.map.isOpen}
        onClose={() => closeModal('map')}
        gc={gc}
      /> */}
      
      <ChatModal 
        isOpen={modals.chat.isOpen}
        onClose={() => closeModal('chat')}
        gc={gc}
      />
      
      <MoveItemModal 
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
      
      {/* 
      <EnterNameModal 
        isOpen={modals.enterName.isOpen}
        onClose={() => closeModal('enterName')}
        gc={gc}
        data={modals.enterName.data}
      />
      */}
      
      <ReadableModal 
        isOpen={modals.readable.isOpen}
        onClose={() => closeModal('readable')}
        gc={gc}
        data={modals.readable.data}
      />
      
      <LetterModal 
        isOpen={modals.letter.isOpen}
        onClose={() => closeModal('letter')}
        gc={gc}
        data={modals.letter.data}
      />
      
      <StampedLetterModal 
        isOpen={modals.stampedLetter.isOpen}
        onClose={() => closeModal('stampedLetter')}
        gc={gc}
        data={modals.stampedLetter.data}
      />
      
      <LabelModal 
        isOpen={modals.label.isOpen}
        onClose={() => closeModal('label')}
        gc={gc}
        data={modals.label.data}
      />
      
      {/*
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

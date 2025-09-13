import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface OutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function OutfitModal({ isOpen, onClose, gc }: OutfitModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="outfit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Outfit</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Outfit customization coming soon...</div>
      </div>
    </div>
  );
}

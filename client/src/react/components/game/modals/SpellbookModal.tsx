import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface SpellbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function SpellbookModal({ isOpen, onClose, gc }: SpellbookModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="spellbook-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Spellbook</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Spellbook coming soon...</div>
      </div>
    </div>
  );
}

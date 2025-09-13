import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: any;
}

export default function MoveItemModal({ isOpen, onClose, gc, data }: MoveItemModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="move-item-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Move Item</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Move item interface coming soon...</div>
      </div>
    </div>
  );
}

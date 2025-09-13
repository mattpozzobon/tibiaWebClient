import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface EnterNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: any;
}

export default function EnterNameModal({ isOpen, onClose, gc, data }: EnterNameModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="enter-name-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Enter Name</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Name input coming soon...</div>
      </div>
    </div>
  );
}

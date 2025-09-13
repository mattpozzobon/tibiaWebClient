import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface ReadableModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: any;
}

export default function ReadableModal({ isOpen, onClose, gc, data }: ReadableModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="readable-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Readable</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Readable content coming soon...</div>
      </div>
    </div>
  );
}

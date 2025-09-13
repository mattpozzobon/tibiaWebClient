import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: any;
}

export default function OfferModal({ isOpen, onClose, gc, data }: OfferModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Trade Offer</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Trade offer interface coming soon...</div>
      </div>
    </div>
  );
}

import React from 'react';
import type GameClient from '../../../../core/gameclient';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function MapModal({ isOpen, onClose, gc }: MapModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Map</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">Map coming soon...</div>
      </div>
    </div>
  );
}

import React from 'react';
import type GameClient from '../../../../core/gameclient';
import BaseModal from '../../shared/BaseModal';
import Minimap from '../hud/minimap';
import './styles/MapModal.scss';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function MapModal({ isOpen, onClose, gc }: MapModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="World Map"
      size="large"
    >
      <div className="map-modal-content">
        <div className="large-minimap">
          <Minimap gc={gc} />
        </div>
        <div className="map-info">
          <p>This is a larger view of the minimap. You can interact with it the same way as the HUD minimap:</p>
          <ul>
            <li>Click to move the view center</li>
            <li>Scroll to zoom in/out</li>
            <li>Use controls to change zoom level and floor</li>
            <li>Click the center button to focus on your player</li>
          </ul>
        </div>
      </div>
    </BaseModal>
  );
}

import React from 'react';
import './styles/ModalsWrapper.scss';

const ModalsWrapper: React.FC = () => {
  return (
    <div className="modal-wrapper">
      {/* Modal containers - these will be populated by the game client */}
      <div id="settings-modal-container"></div>
      <div id="skill-modal-container"></div>
      <div id="outfit-modal-container"></div>
      <div id="battle-modal-container"></div>
      <div id="friends-modal-container"></div>
      <div id="redable-modal-container"></div>
      <div id="map-modal-container"></div>
      <div id="enter-name-modal-container"></div>
      <div id="confirm-modal-container"></div>
      <div id="offer-modal-container"></div>
      <div id="spell-modal-container"></div>
      <div id="move-item-modal-container"></div>
      <div id="additional-modals-container"></div>

      {/* Modal elements removed - React components handle all UI */}
    </div>
  );
};

export default ModalsWrapper;

import React from 'react';
import '../styles/IconButton.scss';

interface OutfitIconProps {
  gc?: any;
}

export default function OutfitIcon({ gc }: OutfitIconProps) {
  const handleOutfit = () => {
    (window as any).reactUIManager?.openModal('outfit');
  };

  return (
    <div className="outfit-icon">
      <div className="icon-button" title="Outfit (Ctrl+U)" onClick={handleOutfit}>
        <img src="png/icons/outfit.png" alt="Outfit" />
      </div>
    </div>
  );
}

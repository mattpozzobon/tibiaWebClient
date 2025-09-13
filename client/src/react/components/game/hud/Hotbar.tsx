import React from 'react';
import './styles/Hotbar.scss';

const Hotbar: React.FC = () => {
  const hotbarItems = Array.from({ length: 12 }, (_, i) => (
    <div key={i} className="hotbar-item">
      <canvas></canvas>
      <span className="hotbar-text"></span>
      <span className="hotbar-key">FF{i + 1}</span>
    </div>
  ));

  return (
    <div className="hotbar">
      {hotbarItems}
    </div>
  );
};

export default Hotbar;
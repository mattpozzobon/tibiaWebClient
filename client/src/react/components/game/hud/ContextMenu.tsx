import React from 'react';
import './styles/ContextMenu.scss';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ visible, x, y, items, onClose }) => {
  if (!visible) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="context-menu-backdrop" onClick={onClose} />
      
      {/* Context menu */}
      <div 
        className="context-menu" 
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.className || ''}`}
            onClick={() => handleItemClick(item)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
};

export default ContextMenu;

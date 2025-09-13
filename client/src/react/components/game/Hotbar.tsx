import React, { useState, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
import './styles/Hotbar.scss';

interface HotbarProps {
  gc: GameClient;
}

interface HotbarItem {
  id: number;
  icon: string;
  name: string;
  type: 'spell' | 'item' | 'action';
  cooldown?: number;
  usable?: boolean;
}

export default function Hotbar({ gc }: HotbarProps) {
  const [hotbarItems, setHotbarItems] = useState<HotbarItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  useEffect(() => {
    // Initialize hotbar with empty slots
    const initialItems: HotbarItem[] = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      icon: '',
      name: '',
      type: 'action',
      usable: false
    }));
    setHotbarItems(initialItems);
  }, []);

  const handleHotbarClick = (slotIndex: number) => {
    setSelectedSlot(slotIndex);
    
    // Use the item/spell in the slot
    const item = hotbarItems[slotIndex];
    if (item && item.usable) {
      // Trigger the action based on type
      switch (item.type) {
        case 'spell':
          // Cast spell
          console.log(`Casting spell: ${item.name}`);
          break;
        case 'item':
          // Use item
          console.log(`Using item: ${item.name}`);
          break;
        case 'action':
          // Perform action
          console.log(`Performing action: ${item.name}`);
          break;
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    const key = event.key;
    
    // Handle number keys 1-9 and 0, -, =
    if (key >= '1' && key <= '9') {
      const slotIndex = parseInt(key) - 1;
      handleHotbarClick(slotIndex);
    } else if (key === '0') {
      handleHotbarClick(9);
    } else if (key === '-') {
      handleHotbarClick(10);
    } else if (key === '=') {
      handleHotbarClick(11);
    }
  };

  return (
    <div 
      className="hotbar-container"
      tabIndex={0}
      onKeyDown={handleKeyPress}
    >
      <div className="hotbar">
        {hotbarItems.map((item, index) => (
          <div
            key={item.id}
            className={`hotbar-slot ${selectedSlot === index ? 'selected' : ''} ${item.usable ? 'usable' : 'empty'}`}
            onClick={() => handleHotbarClick(index)}
            title={item.name || `Slot ${index + 1}`}
          >
            {item.icon && (
              <div className="hotbar-icon">
                <img src={item.icon} alt={item.name} />
              </div>
            )}
            
            {item.cooldown && item.cooldown > 0 && (
              <div className="cooldown-overlay">
                <span className="cooldown-text">{Math.ceil(item.cooldown)}</span>
              </div>
            )}
            
            <div className="hotbar-key">
              {index < 9 ? index + 1 : index === 9 ? '0' : index === 10 ? '-' : '='}
            </div>
          </div>
        ))}
      </div>
      
      <div className="hotbar-info">
        <span>Hotbar - Press 1-9, 0, -, = to use items</span>
      </div>
    </div>
  );
}

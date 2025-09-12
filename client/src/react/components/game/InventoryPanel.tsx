import React, { useState } from 'react';
import type GameClient from '../../../core/gameclient';

interface InventoryPanelProps {
  gc: GameClient;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  icon: string;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export default function InventoryPanel({ gc }: InventoryPanelProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [inventoryItems] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Health Potion',
      quantity: 5,
      icon: 'potion_health.png',
      description: 'Restores 50 health points',
      rarity: 'common'
    },
    {
      id: '2',
      name: 'Magic Sword',
      quantity: 1,
      icon: 'sword_magic.png',
      description: 'A sword imbued with magical energy',
      rarity: 'rare'
    },
    {
      id: '3',
      name: 'Gold Coin',
      quantity: 1000,
      icon: 'coin_gold.png',
      description: 'Currency used in the game',
      rarity: 'common'
    }
  ]);

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleUseItem = (item: InventoryItem) => {
    // TODO: Implement item usage logic
    console.log(`Using item: ${item.name}`);
    // gc.networkManager.useItem(item.id);
  };

  const handleDropItem = (item: InventoryItem) => {
    // TODO: Implement item dropping logic
    console.log(`Dropping item: ${item.name}`);
    // gc.networkManager.dropItem(item.id);
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'common': return '#ffffff';
      case 'rare': return '#0080ff';
      case 'epic': return '#8000ff';
      case 'legendary': return '#ff8000';
      default: return '#ffffff';
    }
  };

  return (
    <div className="inventory-panel">
      <div className="inventory-header">
        <h3>Inventory</h3>
        <span className="inventory-count">
          {inventoryItems.length} items
        </span>
      </div>
      
      <div className="inventory-content">
        <div className="inventory-grid">
          {inventoryItems.map((item) => (
            <div
              key={item.id}
              className="inventory-slot"
              onClick={() => handleItemClick(item)}
              style={{ borderColor: getRarityColor(item.rarity) }}
            >
              <img 
                src={`png/items/${item.icon}`} 
                alt={item.name}
                className="item-icon"
              />
              <span className="item-quantity">{item.quantity}</span>
              <div className="item-name">{item.name}</div>
            </div>
          ))}
        </div>
        
        {selectedItem && (
          <div className="item-details">
            <h4>{selectedItem.name}</h4>
            <img 
              src={`png/items/${selectedItem.icon}`} 
              alt={selectedItem.name}
              className="item-detail-icon"
            />
            <p className="item-description">{selectedItem.description}</p>
            <p className="item-quantity-detail">Quantity: {selectedItem.quantity}</p>
            <div className="item-actions">
              <button 
                onClick={() => handleUseItem(selectedItem)}
                className="item-action-btn use-btn"
              >
                Use
              </button>
              <button 
                onClick={() => handleDropItem(selectedItem)}
                className="item-action-btn drop-btn"
              >
                Drop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

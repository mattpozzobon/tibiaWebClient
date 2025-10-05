import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';
import { ItemRenderer } from '../../../../utils/item-renderer';
import { UseBeltPotionPacket } from '../../../../core/protocol';
import type GameClient from '../../../../core/gameclient';
import type Item from '../../../../game/item';
import './styles/BeltHotbar.scss';

interface BeltHotbarProps {
  gc: GameClient;
}

interface BeltSlot {
  item: Item | null;
  canvas: HTMLCanvasElement | null;
}

export default function BeltHotbar({ gc }: BeltHotbarProps) {
  const { equipment, equipmentItems } = usePlayerEquipment(gc);
  const [beltSlots, setBeltSlots] = useState<BeltSlot[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [beltContainer, setBeltContainer] = useState<any>(null);

  // Get belt item (equipment slot 14)
  const beltItem = equipmentItems[14];
  
  // Get player outfit addons for potion icons
  const outfitAddons = gc.player?.outfit?.addons;

  // Create 3 slots based on outfit addons (only if belt is equipped)
  useEffect(() => {
    if (!beltItem) {
      setBeltSlots([]);
      return;
    }
    
    const slots: BeltSlot[] = [];
    
    // Create 3 slots for health, mana, and energy potions
    for (let i = 0; i < 3; i++) {
      slots.push({
        item: null, // No actual items, just icons
        canvas: null
      });
    }
    
    setBeltSlots(slots);
  }, [beltItem, outfitAddons]);

  // Force re-render when outfit addons change by using a state that tracks the addon values
  const [addonState, setAddonState] = useState({
    healthPotion: 0,
    manaPotion: 0,
    energyPotion: 0
  });

  // Update addon state when outfit addons change
  useEffect(() => {
    if (outfitAddons) {
      const newState = {
        healthPotion: outfitAddons.healthPotion || 0,
        manaPotion: outfitAddons.manaPotion || 0,
        energyPotion: outfitAddons.energyPotion || 0
      };
      
      // Always update to ensure we catch changes
      setAddonState(newState);
    }
  }, [outfitAddons]);

  // Listen for outfit changes by monitoring the outfit object directly
  useEffect(() => {
    if (!gc.player?.outfit) return;

    // Force a re-render when outfit changes by using a ref to track changes
    const forceUpdate = () => {
      if (gc.player?.outfit?.addons) {
        const currentAddons = gc.player.outfit.addons;
        const newState = {
          healthPotion: currentAddons.healthPotion || 0,
          manaPotion: currentAddons.manaPotion || 0,
          energyPotion: currentAddons.energyPotion || 0
        };
        setAddonState(newState);
      }
    };

    // Check for changes periodically (fallback)
    const interval = setInterval(forceUpdate, 200);

    return () => clearInterval(interval);
  }, [gc.player]);


  // Get potion type for each slot
  const getPotionType = useCallback((index: number) => {
    switch (index) {
      case 0: return addonState.healthPotion > 0 ? 'health' : null;
      case 1: return addonState.manaPotion > 0 ? 'mana' : null;
      case 2: return addonState.energyPotion > 0 ? 'energy' : null;
      default: return null;
    }
  }, [addonState]);

  // Handle slot click
  const handleSlotClick = useCallback((index: number) => {
    const potionType = getPotionType(index);
    if (potionType) {
      // Check if the addon is actually active (value > 0)
      const isActive = (index === 0 && addonState.healthPotion > 0) ||
                      (index === 1 && addonState.manaPotion > 0) ||
                      (index === 2 && addonState.energyPotion > 0);
      
      if (isActive) {
        // Send the belt potion packet to the server
        const packet = new UseBeltPotionPacket(potionType);
        gc.send(packet);
        console.log(`Using ${potionType} potion via belt hotbar`);
      }
    }
  }, [getPotionType, addonState, gc]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (beltSlots.length === 0) return;

      // Check for number keys 1-3
      const key = event.key;
      const slotIndex = parseInt(key) - 1;
      
      if (slotIndex >= 0 && slotIndex < beltSlots.length) {
        // Check if the addon is active before allowing the shortcut
        const isActive = (slotIndex === 0 && addonState.healthPotion > 0) ||
                        (slotIndex === 1 && addonState.manaPotion > 0) ||
                        (slotIndex === 2 && addonState.energyPotion > 0);
        
        if (isActive) {
          event.preventDefault();
          handleSlotClick(slotIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [beltSlots.length, handleSlotClick, addonState]);

  // Don't render if no belt item or no outfit addons
  if (!beltItem || !outfitAddons || beltSlots.length === 0) {
    return null;
  }

  return (
    <div className="belt-hotbar">
      {beltSlots.map((slot, index) => {
        const potionType = getPotionType(index);
        const isActive = (
          (index === 0 && addonState.healthPotion > 0) ||
          (index === 1 && addonState.manaPotion > 0) ||
          (index === 2 && addonState.energyPotion > 0)
        );
        
        const slotTitle = potionType ? 
          `${potionType.charAt(0).toUpperCase() + potionType.slice(1)} Potion ${isActive ? '(Active)' : '(Inactive)'}` : 
          `Slot ${index + 1}`;
        
        return (
          <div
            key={index}
            className={`belt-slot ${potionType ? `potion-slot ${potionType}-potion${!isActive ? ' inactive' : ''}` : 'empty-slot'}`}
            onClick={() => handleSlotClick(index)}
            title={slotTitle}
          >
            {potionType ? (
              <div className="potion-icon">
                <span className={`potion-emoji ${potionType}-potion-emoji`}>
                  {potionType === 'health' && '❤️'}
                  {potionType === 'mana' && '💙'}
                  {potionType === 'energy' && '⚡'}
                </span>
              </div>
            ) : (
              <div className="empty-slot-content"></div>
            )}
            <span className="belt-key">{index + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

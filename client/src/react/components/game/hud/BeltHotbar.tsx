import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';
import { ItemRenderer } from '../../../../utils/item-renderer';
import { UseBeltPotionPacket } from '../../../../core/protocol';
import type GameClient from '../../../../core/gameclient';
import Item from '../../../../game/item';
import './styles/BeltHotbar.scss';

interface BeltHotbarProps {
  gc: GameClient;
}

interface BeltSlot {
  item: Item | null;
  canvas: HTMLCanvasElement | null;
}

interface PotionState {
  healthPotionId: number;
  healthQuantity: number;
  manaPotionId: number;
  manaQuantity: number;
  energyPotionId: number;
  energyQuantity: number;
}

const DEFAULT_POTION_STATE: PotionState = {
  healthPotionId: 0,
  healthQuantity: 0,
  manaPotionId: 0,
  manaQuantity: 0,
  energyPotionId: 0,
  energyQuantity: 0,
};

const BELT_SLOT_COUNT = 3;
const CANVAS_SIZE = 32;

export default function BeltHotbar({ gc }: BeltHotbarProps) {
  const { equipmentItems } = usePlayerEquipment(gc);
  const [beltSlots, setBeltSlots] = useState<BeltSlot[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Get belt item from equipment slot 14
  const beltItem = equipmentItems[14];
  
  // Get belt potion quantities from player
  const beltPotionQuantities = gc.player?.beltPotionQuantities || DEFAULT_POTION_STATE;

  // Determine if belt is equipped
  const isBeltEquipped = useMemo(() => 
    beltPotionQuantities.healthPotionId > 0 || 
    beltPotionQuantities.manaPotionId > 0 || 
    beltPotionQuantities.energyPotionId > 0,
    [beltPotionQuantities]
  );
  
  const hasBelt = beltItem || isBeltEquipped;

  // Track potion state
  const [potionState, setPotionState] = useState<PotionState>(beltPotionQuantities);

  // Update state when player's belt potion quantities change
  useEffect(() => {
    if (gc.player?.beltPotionQuantities) {
      setPotionState(gc.player.beltPotionQuantities);
    }
  }, [gc.player?.beltPotionQuantities]);

  // Initialize belt slots
  useEffect(() => {
    if (!hasBelt) {
      setBeltSlots([]);
      return;
    }
    
    const slots: BeltSlot[] = Array.from({ length: BELT_SLOT_COUNT }, () => ({
      item: null,
      canvas: null
    }));
    
    setBeltSlots(slots);
  }, [hasBelt]);

  // Get potion data for a specific slot index
  const getPotionData = useCallback((index: number): { id: number; quantity: number } => {
    switch (index) {
      case 0:
        return { id: potionState.healthPotionId, quantity: potionState.healthQuantity };
      case 1:
        return { id: potionState.manaPotionId, quantity: potionState.manaQuantity };
      case 2:
        return { id: potionState.energyPotionId, quantity: potionState.energyQuantity };
      default:
        return { id: 0, quantity: 0 };
    }
  }, [potionState]);

  // Render potion items to canvas
  useEffect(() => {
    if (!gc || beltSlots.length === 0) return;

    beltSlots.forEach((_, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;

      const { id: potionId, quantity } = getPotionData(index);

      if (potionId > 0) {
        const potionItem = new Item(potionId, quantity);
        ItemRenderer.renderItemToCanvas(gc, potionItem, canvas, { 
          size: CANVAS_SIZE, 
          background: 'transparent' 
        });
      } else {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
  }, [gc, beltSlots, getPotionData]);


  // Get potion type name for a slot
  const getPotionType = useCallback((index: number): 'health' | 'mana' | 'energy' | null => {
    const potionTypes: Array<'health' | 'mana' | 'energy' | null> = [
      potionState.healthPotionId > 0 ? 'health' : null,
      potionState.manaPotionId > 0 ? 'mana' : null,
      potionState.energyPotionId > 0 ? 'energy' : null,
    ];
    return potionTypes[index] ?? null;
  }, [potionState]);

  // Check if a slot has available potions
  const isSlotActive = useCallback((index: number): boolean => {
    const { quantity } = getPotionData(index);
    return quantity > 0;
  }, [getPotionData]);

  // Handle slot click
  const handleSlotClick = useCallback((index: number) => {
    const potionType = getPotionType(index);
    if (!potionType || !isSlotActive(index)) return;

    const packet = new UseBeltPotionPacket(potionType);
    gc.send(packet);
    console.log(`Using ${potionType} potion via belt hotbar`);
  }, [getPotionType, isSlotActive, gc]);

  // Expose handleSlotClick to keyboard system
  useEffect(() => {
    (window as any).reactBeltHotbar = {
      handleSlotClick: (slotIndex: number) => {
        if (beltSlots.length === 0 || slotIndex < 0 || slotIndex >= beltSlots.length) {
          return;
        }
        
        if (isSlotActive(slotIndex)) {
          handleSlotClick(slotIndex);
        }
      },
      hasBeltSlots: beltSlots.length > 0
    };

    return () => {
      delete (window as any).reactBeltHotbar;
    };
  }, [beltSlots.length, handleSlotClick, isSlotActive]);

  // Render individual slot
  const renderSlot = useCallback((index: number) => {
    const potionType = getPotionType(index);
    const { quantity } = getPotionData(index);
    const active = isSlotActive(index);
    
    const slotTitle = potionType 
      ? `${potionType.charAt(0).toUpperCase() + potionType.slice(1)} Potion (${quantity})`
      : `Slot ${index + 1}`;
    
    const slotClassName = potionType
      ? `belt-slot potion-slot ${potionType}-potion${!active ? ' inactive' : ''}`
      : 'belt-slot empty-slot';

    return (
      <div
        key={index}
        className={slotClassName}
        onClick={() => handleSlotClick(index)}
        title={slotTitle}
      >
        {potionType ? (
          <>
            <canvas
              ref={(el) => {
                if (el) {
                  canvasRefs.current[index] = el;
                  el.width = CANVAS_SIZE;
                  el.height = CANVAS_SIZE;
                }
              }}
              className="potion-canvas"
            />
            {quantity > 0 && (
              <span className="belt-count">{quantity}</span>
            )}
          </>
        ) : (
          <div className="empty-slot-content"></div>
        )}
        <span className="belt-key">{index + 1}</span>
      </div>
    );
  }, [getPotionType, getPotionData, isSlotActive, handleSlotClick]);

  // Don't render if no belt equipped
  if (!hasBelt || beltSlots.length === 0) {
    return null;
  }

  return (
    <div className="belt-hotbar">
      {beltSlots.map((_, index) => renderSlot(index))}
    </div>
  );
}

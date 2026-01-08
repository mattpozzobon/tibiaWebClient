import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // Only render if belt is actually equipped (check equipment slot)
  const hasBelt = beltItem !== null && beltItem !== undefined;

  // Track potion state
  const [potionState, setPotionState] = useState<PotionState>(beltPotionQuantities);

  // Update state when player's belt potion quantities change
  // Use polling to detect changes since React won't detect nested object mutations
  useEffect(() => {
    if (!gc.player) {
      setPotionState(DEFAULT_POTION_STATE);
      return;
    }

    const updatePotionState = () => {
      const quantities = gc.player?.beltPotionQuantities || DEFAULT_POTION_STATE;
      
      setPotionState(prev => {
        // Only update if values actually changed
        if (
          prev.healthPotionId !== quantities.healthPotionId ||
          prev.healthQuantity !== quantities.healthQuantity ||
          prev.manaPotionId !== quantities.manaPotionId ||
          prev.manaQuantity !== quantities.manaQuantity ||
          prev.energyPotionId !== quantities.energyPotionId ||
          prev.energyQuantity !== quantities.energyQuantity
        ) {
          return {
            healthPotionId: quantities.healthPotionId,
            healthQuantity: quantities.healthQuantity,
            manaPotionId: quantities.manaPotionId,
            manaQuantity: quantities.manaQuantity,
            energyPotionId: quantities.energyPotionId,
            energyQuantity: quantities.energyQuantity,
          };
        }
        return prev;
      });
    };

    // Initial update
    updatePotionState();

    // Poll for changes every 100ms (same as usePlayerConditions)
    const interval = setInterval(updatePotionState, 100);

    return () => clearInterval(interval);
  }, [gc, gc.player]);

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
    if (!gc || !hasBelt) return;

    // Use a small delay to ensure canvas refs are set after DOM updates
    const renderTimer = setTimeout(() => {
      for (let index = 0; index < BELT_SLOT_COUNT; index++) {
        const canvas = canvasRefs.current[index];
        if (!canvas) continue;

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
      }
    }, 0);

    return () => clearTimeout(renderTimer);
  }, [gc, hasBelt, getPotionData, potionState, equipmentItems]);


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
                  
                  // Render immediately when canvas is mounted
                  if (gc) {
                    const { id: potionId, quantity } = getPotionData(index);
                    if (potionId > 0) {
                      const potionItem = new Item(potionId, quantity);
                      ItemRenderer.renderItemToCanvas(gc, potionItem, el, { 
                        size: CANVAS_SIZE, 
                        background: 'transparent' 
                      });
                    }
                  }
                } else {
                  canvasRefs.current[index] = null;
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

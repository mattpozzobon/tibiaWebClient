// EquipmentPanel.tsx
import React, { useEffect, useRef } from 'react';
import { ItemRenderer } from '../../../../utils/item-renderer';
import Item from '../../../../game/item';
import type GameClient from '../../../../core/gameclient';
import { usePlayerEquipment, usePlayerVitals } from '../../../hooks/usePlayerAttribute';
import './styles/EquipmentPanel.scss';

interface EquipmentPanelProps {
  gc: GameClient;
  containerIndex: number;
}

const DISPLAY_ORDER = [
  'necklace-slot', 'helmet-slot', 'backpack-slot', 
  'left-slot', 'armor-slot', 'right-slot', 
  'belt-slot', 'legs-slot', 'quiver-slot', 
  'ring-slot', 'boots-slot', 'ring2-slot',
  'ring3-slot', 'ring4-slot', 'ring5-slot'
] as const;

const LEGACY_INDEX: Record<string, number> = {
  'helmet-slot': 0, 'armor-slot': 1, 'legs-slot': 2, 'boots-slot': 3,
  'right-slot': 4, 'left-slot': 5, 'backpack-slot': 6, 'necklace-slot': 7,
  'ring-slot': 8, 'quiver-slot': 9, 'ring2-slot': 10, 'ring3-slot': 11,
  'ring4-slot': 12, 'ring5-slot': 13, 'belt-slot': 14,
};

export default function EquipmentPanel({ gc }: EquipmentPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotDivRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  
  // Use the new hook for equipment data
  const { equipment, equipmentItems, forceRender } = usePlayerEquipment(gc);
  const { vitalValues } = usePlayerVitals(gc);
  

  const renderSlot = (id: string) => {
    const slotIdx = LEGACY_INDEX[id];
    if (slotIdx === undefined) return;
    const canvas = canvasRefs.current[id];
    const slotDiv = slotDivRefs.current[id];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !slotDiv) return;

    const itm: Item | null = equipmentItems[slotIdx] || null;
    
    // Update slot background based on whether item is equipped
    // Use CSS variable for pseudo-element to make it semi-transparent
    if (itm) {
      // Item is equipped - use item.png background
      slotDiv.style.setProperty('--slot-bg-image-inline', "url('../../../../../../png/item.png')");
      ItemRenderer.renderItemToCanvas(gc, itm, canvas, { size: 32, background: 'transparent' });
    } else {
      // No item - use default slot background
      const slotType = id.replace('-slot', '');
      let backgroundImage = '';
      
      // Handle special cases for slot backgrounds
      if (slotType === 'necklace') {
        backgroundImage = 'shoulder.png';
      } else if (slotType === 'helmet') {
        backgroundImage = 'head.png'; // helmet.png doesn't exist, use head.png
      } else if (slotType === 'belt') {
        backgroundImage = 'item.png'; // belt.png doesn't exist, use item.png
      } else if (slotType.startsWith('ring')) {
        backgroundImage = 'ring.png';
      } else {
        backgroundImage = `${slotType}.png`;
      }
      
      slotDiv.style.setProperty('--slot-bg-image-inline', `url('../../../../../../png/${backgroundImage}')`);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };


  // Wire DOM for mouse.ts compatibility
  useEffect(() => {
    if (!equipment) return;
    containerRef.current?.setAttribute('containerIndex', '0');

    (Object.keys(LEGACY_INDEX) as Array<keyof typeof LEGACY_INDEX>).forEach((id) => {
      const div = slotDivRefs.current[id];
      if (!div) return;
      if (div.dataset.bound === '1') return;
      const idx = LEGACY_INDEX[id];
      div.setAttribute('slotIndex', String(idx));
      if (!div.classList.contains('slot')) div.classList.add('slot');
      div.style.backgroundImage = '';
      equipment.slots[idx]?.setElement(div);
      div.dataset.bound = '1';
    });
  }, [equipment]);

  // Render all slots when equipment items change
  useEffect(() => {
    if (!equipment) return;
    DISPLAY_ORDER.forEach(id => {
      renderSlot(id);
    });
  }, [equipmentItems, forceRender]);


  // Capacity bar component
  const CapacityBar = () => {
    if (!vitalValues) return null;
    
    const percentage = Math.min(vitalValues.maxCapacity > 0 ? (vitalValues.capacity / vitalValues.maxCapacity) * 100 : 0, 100);
    const isLow = percentage < 25;
    const barColor = isLow ? '#FFC107' : '#9E9E9E';
    
    const displayCurrent = Math.round(vitalValues.capacity / 100);
    const displayMax = Math.round(vitalValues.maxCapacity / 100);
    
    const formatNumber = (num: number): string => {
      if (num > 1000) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }
      return num.toString();
    };
    
    const formattedCurrent = formatNumber(displayCurrent);
    const formattedMax = formatNumber(displayMax);
    
    return (
      <div className="equipment-capacity-bar">
        <div className="capacity-bar-icon">
          <img src="png/skills/max-cap.png" alt="Capacity" />
        </div>
        <div className="capacity-bar-container">
          <div
            className="capacity-bar-fill"
            style={{ width: `${percentage}%`, backgroundColor: barColor, transition: 'width 0.3s ease, background-color 0.3s ease' }}
          />
          <div className="capacity-bar-value">{formattedCurrent} oz / {formattedMax} oz</div>
        </div>
      </div>
    );
  };

  return (
    <div className="equipment-panel equipment-container" ref={containerRef}>
      <div className="equipment-slots">
        {DISPLAY_ORDER.map((id) => {
          const slotClass = id.replace('-slot','');
          return (
            <div 
              key={id} 
              id={id} 
              className={`slot slot-${slotClass}`} 
              ref={(el) => { slotDivRefs.current[id] = el; }}
            >
              <canvas width={32} height={32} ref={(el) => { canvasRefs.current[id] = el; }}/>
            </div>
          );
        })}
      </div>
      <CapacityBar />
    </div>
  );
}

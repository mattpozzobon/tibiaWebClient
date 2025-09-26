// EquipmentPanel.tsx
import React, { useEffect, useRef } from 'react';
import './styles/EquipmentPanel.scss';
import { ItemRenderer } from '../../../../utils/item-renderer';
import Item from '../../../../game/item';
import type GameClient from '../../../../core/gameclient';
import { usePlayerEquipment } from '../../../hooks/usePlayerAttribute';

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

  const renderSlot = (id: string) => {
    const slotIdx = LEGACY_INDEX[id];
    if (slotIdx === undefined) return;
    const canvas = canvasRefs.current[id];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const itm: Item | null = equipmentItems[slotIdx] || null;
    if (itm) {
      ItemRenderer.renderItemToCanvas(gc, itm, canvas, { size: 32, background: 'transparent' });
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // wire DOM once equipment exists (mouse.ts compat)
  useEffect(() => {
    if (!equipment) return;
    containerRef.current?.setAttribute('containerIndex', '0');

    (Object.keys(LEGACY_INDEX) as Array<keyof typeof LEGACY_INDEX>).forEach((id) => {
      const div = slotDivRefs.current[id];
      if (!div) return;
      const idx = LEGACY_INDEX[id];
      div.setAttribute('slotIndex', String(idx));
      if (!div.classList.contains('slot')) div.classList.add('slot');
      equipment.slots[idx]?.setElement(div);
    });
  }, [equipment]); // re-run when equipment becomes available

  // Render all slots when equipment items change
  useEffect(() => {
    DISPLAY_ORDER.forEach(id => {
      renderSlot(id);
    });
  }, [equipmentItems, forceRender]); // Re-render when items change

  return (
    <div id="react-equipment" className="equipment-window">
      <div className="equipment-window-header">Equipment</div>
      <div className="equipment-window-body">
        <div className="equipment-container" ref={containerRef}>
          <div className="equipment-slots">
            {DISPLAY_ORDER.map((id) => {
              const slotIndex = LEGACY_INDEX[id];
              return (
                <div
                  key={id}
                  id={id}
                  className={`slot slot-${id.replace('-slot','')}`}
                  ref={(el) => { slotDivRefs.current[id] = el; }}
                >
                  <canvas
                    width={32}
                    height={32}
                    ref={(el) => { canvasRefs.current[id] = el; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

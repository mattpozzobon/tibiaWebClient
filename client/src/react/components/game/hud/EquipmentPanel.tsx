import React, { useEffect, useRef } from 'react';
import './styles/EquipmentPanel.scss';
import { ItemRenderer } from '../../../../utils/item-renderer';
import Item from '../../../../game/item';
import type GameClient from '../../../../core/gameclient';
import Equipment, { EQUIPMENT_EVENTS } from '../../../../game/player/equipment/equipment';

interface EquipmentPanelProps {
  gc: GameClient;
  containerIndex: number;
}

const DISPLAY_ORDER = [
  'shoulder-slot',
  'head-slot',
  'backpack-slot',
  'left-slot',
  'armor-slot',
  'right-slot',
  'ring-slot',
  'boots-slot',
  'quiver-slot'
] as const;

const LEGACY_INDEX: Record<string, number> = {
  'head-slot': 0, 'armor-slot': 1, 'legs-slot': 2, 'boots-slot': 3,
  'right-slot': 4, 'left-slot': 5, 'backpack-slot': 6, 'shoulder-slot': 7,
  'ring-slot': 8, 'quiver-slot': 9,
};

export default function EquipmentPanel({ gc }: EquipmentPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotDivRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const unsubRef = useRef<(() => void)[]>([]);

  // Helper to draw one slot
  const renderSlot = (slotIdx: number) => {
    const id = Object.keys(LEGACY_INDEX).find(k => LEGACY_INDEX[k] === slotIdx);
    if (!id) return;
    const canvas = canvasRefs.current[id];
    const ctx = canvas?.getContext('2d');
    const eq: Equipment | undefined = gc.player?.equipment as any;
    if (!ctx || !eq) return;

    const itm: Item | null = eq.slots[slotIdx]?.item ?? null;
    if (itm) {
      ItemRenderer.renderItemToCanvas(gc, itm, canvas!, { size: 32, background: 'transparent' });
    } else {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    }
  };

  // Initial DOM wiring for mouse.ts compatibility + slot mapping
  useEffect(() => {
    const eq: Equipment | undefined = gc?.player?.equipment as any;
    if (!eq) return;

    // mouse.ts expects equipment containerIndex=0
    containerRef.current?.setAttribute('containerIndex', '0');

    (Object.keys(LEGACY_INDEX) as Array<keyof typeof LEGACY_INDEX>).forEach((id) => {
      const div = slotDivRefs.current[id];
      if (!div) return;
      const idx = LEGACY_INDEX[id];
      div.setAttribute('slotIndex', String(idx));
      if (!div.className.includes('slot')) div.className += ' slot';
      // Connect Slot <-> DOM (legacy)
      if (eq.slots[idx] && typeof eq.slots[idx].setElement === 'function') {
        eq.slots[idx].setElement(div);
      }
    });
  }, [gc]);

  // Subscribe to equipment events and render on change
  useEffect(() => {
    const eq: Equipment | undefined = gc?.player?.equipment as any;
    if (!eq) return;

    // If the equipment is already ready, do a full initial paint
    const paintAll = () => {
      for (let i = 0; i < 10; i++) renderSlot(i);
    };
    if ((eq as any).isReady) {
      paintAll();
    }

    // Listen for READY + CHANGED
    const offReady = eq.on(EQUIPMENT_EVENTS.READY, paintAll);
    const offChanged = eq.on(EQUIPMENT_EVENTS.CHANGED, (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (typeof detail.slot === 'number') renderSlot(detail.slot);
      else paintAll();
    });

    unsubRef.current.push(offReady, offChanged);
    return () => {
      // cleanup listeners
      unsubRef.current.forEach(fn => fn && fn());
      unsubRef.current = [];
    };
  }, [gc]);

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

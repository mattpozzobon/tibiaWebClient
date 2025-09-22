import React, { useEffect, useRef } from 'react';
import './styles/EquipmentPanel.scss';
import { ItemRenderer } from '../../../../utils/item-renderer';
import Item from '../../../../game/item';
import type GameClient from '../../../../core/gameclient';

interface EquipmentPanelProps {
  gc: GameClient;
  containerIndex: number; // DOM attribute compatibility for mouse.ts
}

// Visual order requested by user, but we must preserve legacy indices
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
  'head-slot': 0,
  'armor-slot': 1,
  'legs-slot': 2,
  'boots-slot': 3,
  'right-slot': 4,
  'left-slot': 5,
  'backpack-slot': 6,
  'shoulder-slot': 7,
  'ring-slot': 8,
  'quiver-slot': 9,
};

export default function EquipmentPanel({ gc, containerIndex }: EquipmentPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    if (!gc?.player?.equipment) return;
    const equipment = gc.player.equipment;

    // Set containerIndex on parent container
    if (containerRef.current) {
      containerRef.current.setAttribute('containerIndex', String(0));
    }

    // Map visual divs to legacy slot indices expected by the engine
    (Object.keys(LEGACY_INDEX) as Array<keyof typeof LEGACY_INDEX>).forEach((id) => {
      const el = slotRefs.current[id];
      const canvas = canvasRefs.current[id];
      console.log(`Setting up slot ${id}:`, { el: !!el, canvas: !!canvas });
      if (!el || !canvas) {
        console.log(`Missing refs for ${id}, retrying...`);
        // Try again after a short delay
        setTimeout(() => {
          const retryEl = slotRefs.current[id];
          const retryCanvas = canvasRefs.current[id];
          if (retryEl && retryCanvas) {
            const idx = LEGACY_INDEX[id];
            retryEl.setAttribute('slotIndex', String(idx));
            retryCanvas.setAttribute('slotIndex', String(idx));
            console.log(`Set slotIndex ${idx} for ${id} on retry`);
          }
        }, 100);
        return;
      }
      const idx = LEGACY_INDEX[id];
      el.setAttribute('slotIndex', String(idx));
      canvas.setAttribute('slotIndex', String(idx));
      console.log(`Set slotIndex ${idx} for ${id}`);
      if (!el.className.includes('slot')) el.className += ' slot';
      if (equipment.slots[idx] && typeof equipment.slots[idx].setElement === 'function') {
        equipment.slots[idx].setElement(el);
      }
    });
  }, [gc]);

  // Render item sprites into canvases
  useEffect(() => {
    let raf = 0;
    const render = () => {
      try {
        const equipment = gc.player?.equipment;
        if (equipment) {
          (Object.keys(LEGACY_INDEX) as Array<keyof typeof LEGACY_INDEX>).forEach((id) => {
            const idx = LEGACY_INDEX[id];
            const canvas = canvasRefs.current[id];
            if (!canvas) return;
            const slotObj: any = equipment.slots[idx];
            const itm: Item | null = slotObj?.item ?? null;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            if (itm) {
              ItemRenderer.renderItemToCanvas(gc, itm, canvas, { size: 32, background: 'transparent' });
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          });
        }
      } catch {}
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
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
                  data-slot-index={slotIndex}
                  ref={(el) => { 
                    slotRefs.current[id] = el; 
                    if (el) el.setAttribute('slotIndex', String(slotIndex));
                  }}
                >
                  <canvas
                    width={32}
                    height={32}
                    className={`slot slot-${id.replace('-slot','')}`}
                    data-slot-index={slotIndex}
                    ref={(el) => { 
                      canvasRefs.current[id] = el; 
                      if (el) el.setAttribute('slotIndex', String(slotIndex));
                    }}
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



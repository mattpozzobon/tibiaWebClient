import React, { useEffect, useRef, useState } from 'react';
import { ItemRenderer } from '../../../../utils/item-renderer';
import type GameClient from '../../../../core/gameclient';
import Container from '../../../../game/container';
import Slot from '../../../../game/slot';
import './styles/ContainerPanel.scss';

interface ContainerPanelProps {
  gc: GameClient;
  containerId: number;
}

export default function ContainerPanel({ gc, containerId }: ContainerPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotDivRefs = useRef<Record<string, HTMLDivElement>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement>>({});
  const [container, setContainer] = useState<Container | null>(null);
  const [forceRender, setForceRender] = useState(0);

  // Get container from game client
  useEffect(() => {
    if (!gc?.player) return;
    
    const gameContainer = gc.player.getContainer(containerId);
    if (gameContainer) {
      setContainer(gameContainer);
    }
  }, [gc, containerId, forceRender]);

  // Render individual slot
  const renderSlot = (slot: Slot, index: number) => {
    const div = slotDivRefs.current[`slot-${index}`];
    const canvas = canvasRefs.current[`slot-${index}`];
    
    if (!div || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Always set item.png background for the slot
    div.style.backgroundImage = 'url(/assets/item.png)';
    div.style.backgroundSize = 'contain';
    div.style.backgroundRepeat = 'no-repeat';
    div.style.backgroundPosition = 'center';

    const item = slot.item;
    if (item) {
      // Render the item on canvas
      ItemRenderer.renderItemToCanvas(gc, item, canvas, { size: 32, padding: 0 });
      
      // Draw item count if > 1
      if (item.count > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(item.count.toString(), 20, 12);
      }
    } else {
      // Keep background as item.png for empty slots
    }
  };

  // Wire DOM for mouse.ts compatibility and render slots
  useEffect(() => {
    if (!container) return;
    
    containerRef.current?.setAttribute('containerIndex', containerId.toString());

    // Wire up all slots and render them
    for (let i = 0; i < container.size; i++) {
      const slot = container.slots[i];
      const div = slotDivRefs.current[`slot-${i}`];
      if (!div) continue;
      
      // Set up DOM attributes for mouse.ts compatibility
      if (div.dataset.bound !== '1' && slot) {
        div.setAttribute('slotIndex', i.toString());
        if (!div.classList.contains('slot')) div.classList.add('slot');
        // Always set item.png background for slots
        div.style.backgroundImage = 'url(/assets/item.png)';
        div.style.backgroundSize = 'contain';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundPosition = 'center';
        slot.setElement(div);
        div.dataset.bound = '1';
      }
      
      // Render the slot (even if slot is undefined, we still want to show empty slot)
      if (slot) {
        renderSlot(slot, i);
      } else {
        // If slot doesn't exist yet, render empty slot
        const canvas = canvasRefs.current[`slot-${i}`];
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        // Always set item.png background for empty slots
        div.style.backgroundImage = 'url(/assets/item.png)';
        div.style.backgroundSize = 'contain';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundPosition = 'center';
      }
    }
  }, [container, containerId, forceRender]);

  // Listen for container item changes and re-render
  useEffect(() => {
    if (!container) return;

    // Re-render all slots when container changes
    const reRenderSlots = () => {
      // Ensure we render all slots up to container.size
      for (let i = 0; i < container.size; i++) {
        const slot = container.slots[i];
        const div = slotDivRefs.current[`slot-${i}`];
        if (!div) continue;
        
        if (slot) {
          // Ensure background is item.png even when item exists
          div.style.backgroundImage = 'url(/assets/item.png)';
          div.style.backgroundSize = 'contain';
          div.style.backgroundRepeat = 'no-repeat';
          div.style.backgroundPosition = 'center';
          renderSlot(slot, i);
        } else {
          // If slot doesn't exist yet, render empty slot
          const canvas = canvasRefs.current[`slot-${i}`];
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
          // Always set item.png background for empty slots
          div.style.backgroundImage = 'url(/assets/item.png)';
          div.style.backgroundSize = 'contain';
          div.style.backgroundRepeat = 'no-repeat';
          div.style.backgroundPosition = 'center';
        }
      }
    };

    // Initial render
    reRenderSlots();

    // Listen for container item change events
    const handleContainerItemChanged = (event: CustomEvent) => {
      if (event.detail.containerId === containerId) {
        reRenderSlots();
      }
    };

    window.addEventListener('containerItemChanged', handleContainerItemChanged as EventListener);

    return () => {
      window.removeEventListener('containerItemChanged', handleContainerItemChanged as EventListener);
    };
  }, [container, containerId]);

  if (!container) {
    return (
      <div className="container-panel">
        <div className="container-loading">Loading container...</div>
      </div>
    );
  }

  const rows = Math.ceil(container.size / 5); // 5 items per row
  const gridTemplateRows = `repeat(${rows}, 32px)`;

  return (
    <div 
      ref={containerRef}
      className="container-panel container-container"
      data-container-id={containerId}
    >
      <div 
        className="container-slots"
        style={{ gridTemplateRows }}
      >
        {Array.from({ length: container.size }, (_, index) => (
          <div
            key={index}
            ref={(el) => {
              if (el) slotDivRefs.current[`slot-${index}`] = el;
            }}
            className={`slot slot-${index}`}
            data-slot-index={index}
          >
            <canvas 
              width="32" 
              height="32" 
              ref={(el) => {
                if (el) canvasRefs.current[`slot-${index}`] = el;
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

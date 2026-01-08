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

  // Get background image based on slot type
  const getSlotBackgroundImage = (slotIndex: number): string => {
    if (!container?.slotTypes || slotIndex >= container.slotTypes.length) {
      return 'url(/assets/item.png)';
    }
    
    const slotType = container.slotTypes[slotIndex];
    switch (slotType) {
      case 1:
        return 'url(/assets/rope.png)';
      case 2:
        return 'url(/assets/shovel.png)';
      case 3:
        return 'url(/assets/pick.png)';
      case 4:
        return 'url(/assets/knife.png)';
      case 5:
        return 'url(/assets/fishing.png)';
      case 6:
        return 'url(/assets/potion.png)';
      default:
        return 'url(/assets/item.png)';
    }
  };

  // Render individual slot
  const renderSlot = (slot: Slot, index: number) => {
    const div = slotDivRefs.current[`slot-${index}`];
    const canvas = canvasRefs.current[`slot-${index}`];
    
    if (!div || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const item = slot.item;
    
    // Set background based on slot type, but use item.png if item is equipped
    if (item) {
      // Item is equipped - use item.png background (same as normal slots)
      div.style.backgroundImage = 'url(/assets/item.png)';
      div.style.backgroundSize = 'contain';
      div.style.backgroundRepeat = 'no-repeat';
      div.style.backgroundPosition = 'center';
      
      // Render the item on canvas
      ItemRenderer.renderItemToCanvas(gc, item, canvas, { size: 32, padding: 0 });
      
      // Count is now displayed via a separate span element (like belt hotbar)
    } else {
      // No item - use slot type background
      div.style.backgroundImage = getSlotBackgroundImage(index);
      div.style.backgroundSize = 'contain';
      div.style.backgroundRepeat = 'no-repeat';
      div.style.backgroundPosition = 'center';
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
        // Set background based on slot type
        div.style.backgroundImage = getSlotBackgroundImage(i);
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
        // Set background based on slot type for empty slots
        div.style.backgroundImage = getSlotBackgroundImage(i);
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
          // Set background based on slot type for empty slots
          div.style.backgroundImage = getSlotBackgroundImage(i);
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
        // Force React re-render to update quantity labels
        setForceRender(prev => prev + 1);
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

  // Separate special slots from normal slots
  const specialSlots: number[] = [];
  const normalSlots: number[] = [];
  
  for (let i = 0; i < container.size; i++) {
    if (container.slotTypes && container.slotTypes[i] > 0) {
      specialSlots.push(i);
    } else {
      normalSlots.push(i);
    }
  }

  return (
    <div 
      ref={containerRef}
      className="container-panel container-container"
      data-container-id={containerId}
    >
      {/* Special slots section */}
      {specialSlots.length > 0 && (
        <div className={`special-slots-section ${normalSlots.length > 0 ? 'has-normal-slots' : ''}`}>
          <div className="container-slots special-slots">
            {specialSlots.map((index) => (
              <div
                key={`special-${index}`}
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
                {container.slots[index]?.item && container.slots[index].item.count > 1 && (
                  <span className="slot-count">{container.slots[index].item.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Spacer between special and normal slots */}
      {specialSlots.length > 0 && normalSlots.length > 0 && (
        <div className="slots-spacer"></div>
      )}
      
      {/* Normal slots section */}
      {normalSlots.length > 0 && (
        <div className="normal-slots-section">
          <div className="container-slots normal-slots">
            {normalSlots.map((index) => (
              <div
                key={`normal-${index}`}
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
                {container.slots[index]?.item && container.slots[index].item.count > 1 && (
                  <span className="slot-count">{container.slots[index].item.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

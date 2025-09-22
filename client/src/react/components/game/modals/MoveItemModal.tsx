import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { ItemRenderer } from '../../../../utils/item-renderer';
import Item from '../../../../game/item';
import './styles/MoveItemModal.scss';

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: {
    fromObject: any;
    toObject: any;
    item: { id: number; count: number };
    onConfirm: (count: number) => void;
  };
}

export default function MoveItemModal({ isOpen, onClose, gc, data }: MoveItemModalProps) {
  const [count, setCount] = useState<number>(1);
  const [maxCount, setMaxCount] = useState<number>(1);
  const [itemSprite, setItemSprite] = useState<string | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize modal when data changes
  useEffect(() => {
    if (isOpen && data) {
      setMaxCount(data.item.count);
      setCount(data.item.count);
      
      // Initial sprite render for default count
      try {
        if (canvasRef.current) {
          const tempItem = new Item(data.item.id, data.item.count);
          const success = ItemRenderer.renderItemToCanvas(gc, tempItem, canvasRef.current, { size: 32, background: 'transparent' });
          if (success) setItemSprite(canvasRef.current.toDataURL());
        }
      } catch (error) {
        console.error('Failed to render item sprite:', error);
      }
      
      // Focus the slider
      setTimeout(() => {
        sliderRef.current?.focus();
      }, 100);
    }
  }, [isOpen, data, gc]);

  // Re-render sprite when selected count changes (for stackable items visual)
  useEffect(() => {
    if (!isOpen || !data) return;
    try {
      if (canvasRef.current) {
        const tempItem = new Item(data.item.id, count);
        const success = ItemRenderer.renderItemToCanvas(gc, tempItem, canvasRef.current, { size: 32, background: 'transparent' });
        if (success) setItemSprite(canvasRef.current.toDataURL());
      }
    } catch (error) {
      console.error('Failed to re-render item sprite for count:', count, error);
    }
  }, [count, isOpen, data, gc]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let amount = parseInt(event.target.value);
    
    // If shift key is down, adjust amount in steps of 10
    if (gc.keyboard?.isShiftDown()) {
      if (amount !== maxCount) {
        amount = Math.round(amount / 10) * 10;
      }
    }
    
    // Clamp between 1 and max
    const clampedAmount = Math.min(Math.max(amount, 1), maxCount);
    setCount(clampedAmount);
  };

  const handleConfirm = () => {
    if (data?.onConfirm) {
      data.onConfirm(count);
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleConfirm();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="move-item-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="modal-header">
          <h2>Move Item</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
                 <div className="move-item-preview">
                   <div className="item-sprite-container">
                     {itemSprite ? (
                       <img 
                         src={itemSprite} 
                         alt="Item sprite" 
                         className="item-sprite"
                         style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                       />
                     ) : (
                       <div className="item-sprite-placeholder">
                         <div className="item-sprite-icon">📦</div>
                       </div>
                     )}
                     {/* Hidden canvas for rendering */}
                     <canvas 
                       ref={canvasRef} 
                       width="32" 
                       height="32" 
                       style={{ display: 'none' }}
                     />
                   </div>
                   <div className="item-info">
                     <div className="item-count-display">{count} / {maxCount}</div>
                   </div>
                 </div>
          
          <div className="quantity-selector">
            <label htmlFor="item-amount">Quantity:</label>
            <input
              ref={sliderRef}
              id="item-amount"
              type="range"
              min="1"
              max={maxCount}
              value={count}
              onChange={handleSliderChange}
              className="quantity-slider"
            />
            <input
              type="number"
              min="1"
              max={maxCount}
              value={count}
              onChange={(e) => setCount(Math.min(Math.max(parseInt(e.target.value) || 1, 1), maxCount))}
              className="quantity-input"
            />
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              Move {count} {count === 1 ? 'item' : 'items'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import Outfit from '../../../../game/outfit';
import { OutfitChangePacket } from '../../../../core/protocol';
import './styles/OutfitModal.scss';

interface OutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function OutfitModal({ isOpen, onClose, gc }: OutfitModalProps) {
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [activeSection, setActiveSection] = useState<string>('head');
  const [mountIndex, setMountIndex] = useState<number>(0);
  const [outfitIndex, setOutfitIndex] = useState<number>(0);
  const [faceDirection, setFaceDirection] = useState<number>(0);
  const [animate, setAnimate] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize outfit when modal opens
  useEffect(() => {
    if (isOpen && gc.player) {
      setOutfit(gc.player.outfit.copy());
      setActiveSection('head');
      
      // Set initial indices
      setMountIndex(getIndex(gc.player.mounts, gc.player.outfit.mount));
      setOutfitIndex(getIndex(gc.player.outfits, gc.player.outfit.id));
    }
  }, [isOpen, gc.player]);

  // Render outfit when it changes
  useEffect(() => {
    if (outfit && canvasRef.current) {
      renderOutfit();
    }
  }, [outfit, faceDirection, animate, mountIndex, outfitIndex]);

  const getIndex = (array: any[], id: number): number => {
    for (let i = 0; i < array.length; i++) {
      if (array[i].id === id) {
        return i;
      }
    }
    return 0;
  };

  const handleOutfitSelection = (direction: number) => {
    if (!gc.player || !outfit) return;
    
    setOutfitIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) {
        return gc.player!.outfits.length - 1;
      } else {
        return newIndex % gc.player!.outfits.length;
      }
    });
  };

  const handleMountSelection = (direction: number) => {
    if (!gc.player || !outfit || gc.player.mounts.length === 0) return;
    
    setMountIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) {
        return gc.player!.mounts.length - 1;
      } else {
        return newIndex % gc.player!.mounts.length;
      }
    });
  };

  const handleColorChange = (colorIndex: number) => {
    if (!outfit) return;
    
    const newOutfit = outfit.copy();
    switch (activeSection) {
      case 'head':
        newOutfit.details.head = colorIndex;
        break;
      case 'body':
        newOutfit.details.body = colorIndex;
        break;
      case 'legs':
        newOutfit.details.legs = colorIndex;
        break;
      case 'feet':
        newOutfit.details.feet = colorIndex;
        break;
    }
    setOutfit(newOutfit);
  };

  const handleRotate = () => {
    setFaceDirection(prev => (prev + 1) % 4);
  };

  const handleCheckboxChange = (property: keyof Outfit, value: boolean) => {
    if (!outfit) return;
    
    const newOutfit = outfit.copy();
    (newOutfit as any)[property] = value;
    setOutfit(newOutfit);
  };

  const renderOutfit = () => {
    if (!outfit || !canvasRef.current || !gc.player) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // For now, just draw a placeholder
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Outfit Preview', canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Face: ${faceDirection}`, canvas.width / 2, canvas.height / 2 + 20);
  };

  const handleConfirm = () => {
    if (!outfit || !gc.player || gc.player.outfit.equals(outfit)) {
      onClose();
      return;
    }
    
    // Update outfit properties based on current state
    const finalOutfit = outfit.copy();
    finalOutfit.id = gc.player.outfits[outfitIndex].id;
    finalOutfit.mount = gc.player.mounts.length > 0 ? gc.player.mounts[mountIndex].id : 0;
    
    gc.send(new OutfitChangePacket(finalOutfit));
    onClose();
  };

  if (!isOpen || !gc.player || !outfit) return null;

  const currentOutfit = gc.player.outfits[outfitIndex];
  const currentMount = gc.player.mounts.length > 0 ? gc.player.mounts[mountIndex] : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="outfit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Outfit</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="outfit-preview">
            <canvas
              ref={canvasRef}
              width={128}
              height={128}
              className="outfit-canvas"
            />
            <div className="preview-controls">
              <button onClick={handleRotate} className="rotate-btn">
                Rotate
              </button>
              <label className="animate-toggle">
                <input
                  type="checkbox"
                  checked={animate}
                  onChange={(e) => setAnimate(e.target.checked)}
                />
                Animate
              </label>
            </div>
          </div>

          <div className="outfit-controls">
            <div className="outfit-selection">
              <h3>Outfit</h3>
              <div className="selection-controls">
                <button onClick={() => handleOutfitSelection(-1)}>‹</button>
                <span className="selection-name">{currentOutfit.name}</span>
                <button onClick={() => handleOutfitSelection(1)}>›</button>
              </div>
            </div>

            <div className="mount-selection">
              <h3>Mount</h3>
              <div className="selection-controls">
                <button 
                  onClick={() => handleMountSelection(-1)}
                  disabled={gc.player.mounts.length === 0}
                >
                  ‹
                </button>
                <span className="selection-name">
                  {gc.player.mounts.length === 0 ? 'Mounts Unavailable' : currentMount?.name || 'None'}
                </span>
                <button 
                  onClick={() => handleMountSelection(1)}
                  disabled={gc.player.mounts.length === 0}
                >
                  ›
                </button>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={outfit.mounted}
                  onChange={(e) => handleCheckboxChange('mounted', e.target.checked)}
                  disabled={gc.player.mounts.length === 0}
                />
                Mounted
              </label>
            </div>

            <div className="addons-section">
              <h3>Addons</h3>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={outfit.addonOne}
                  onChange={(e) => handleCheckboxChange('addonOne', e.target.checked)}
                />
                Addon 1
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={outfit.addonTwo}
                  onChange={(e) => handleCheckboxChange('addonTwo', e.target.checked)}
                />
                Addon 2
              </label>
            </div>
          </div>

          <div className="color-picker">
            <h3>Colors</h3>
            <div className="section-tabs">
              {['head', 'body', 'legs', 'feet'].map((section) => (
                <button
                  key={section}
                  className={`section-tab ${activeSection === section ? 'active' : ''}`}
                  onClick={() => setActiveSection(section)}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
            </div>
            <div className="color-grid">
              {Outfit.colors.slice(0, 64).map((color, index) => (
                <button
                  key={index}
                  className="color-swatch"
                  style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                  onClick={() => handleColorChange(index)}
                  title={`Color ${index}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

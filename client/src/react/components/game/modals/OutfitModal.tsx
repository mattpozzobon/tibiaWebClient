import React, { useState, useEffect, useRef, useCallback } from 'react';
import type GameClient from '../../../../core/gameclient';
import Outfit from '../../../../game/outfit';
import { OutfitChangePacket } from '../../../../core/protocol';
import { renderOutfitToCanvas } from '../../../../utils/outfit-renderer'; // <- helper with {faceDirection, animate, padding, background}
import './styles/OutfitModal.scss';

interface OutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function OutfitModal({ isOpen, onClose, gc }: OutfitModalProps) {
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [activeSection, setActiveSection] = useState<string>('head');
  // Removed mountIndex and outfitIndex since we're not changing outfits or mounts
  const [faceDirection, setFaceDirection] = useState<number>(2); // default South, matches helper
  const [animate, setAnimate] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Initialize local copy when modal opens
  useEffect(() => {
    if (!isOpen || !gc.player) return;
    const base = gc.player.outfit.copy();
    setOutfit(base);
    setActiveSection('head');
    // Removed mount and outfit index initialization since we're not changing them
    setFaceDirection(2); // South
    setAnimate(false);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, gc.player]);

  // Removed getIndex function since we're not using it anymore

  // Removed outfit sync useEffect since we're not changing outfits

  // Removed mount sync useEffect since we're not using mounts

  // Removed handleOutfitSelection and handleMountSelection since we're not changing outfits or mounts

  const handleColorChange = (colorIndex: number) => {
    if (!outfit) return;
    const next = outfit.copy();
    switch (activeSection) {
      case 'head': next.details.head = colorIndex; break;
      case 'body': next.details.body = colorIndex; break;
      case 'legs': next.details.legs = colorIndex; break;
      case 'feet': next.details.feet = colorIndex; break;
    }
    setOutfit(next);
  };

  const handleRotate = () => {
    setFaceDirection(prev => (prev + 1) % 4); // 0 N, 1 E, 2 S, 3 W
  };

  const handleCheckboxChange = (property: keyof Outfit, value: boolean) => {
    if (!outfit) return;
    const next = outfit.copy();
    (next as any)[property] = value;
    setOutfit(next);
  };

  // Render once
  const renderOnce = useCallback(() => {
    if (!outfit || !canvasRef.current) return;
    renderOutfitToCanvas(gc, outfit, canvasRef.current, {
      faceDirection,
      animate,           // helper will pick animated frame; we drive the loop below
      padding: 4,
      background: "transparent",
    });
  }, [gc, outfit, faceDirection, animate]);

  // Animate loop (only when animate === true)
  useEffect(() => {
    if (!isOpen) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!animate) {
      renderOnce();
      return;
    }
    const tick = () => {
      renderOnce();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isOpen, animate, renderOnce]);

  // Also update preview on any param change when not animating
  useEffect(() => {
    if (animate) return; // loop handles it
    renderOnce();
  }, [renderOnce, animate, outfit, faceDirection]);

  const handleConfirm = () => {
    if (!outfit || !gc.player) return onClose();

    // Only send color changes, no outfit or mount changes
    if (!gc.player.outfit.equals(outfit)) {
      gc.send(new OutfitChangePacket(outfit));
    }
    onClose();
  };

  if (!isOpen || !gc.player || !outfit) return null;

  // Removed currentOutfit and currentMount since we're not changing outfits or mounts

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
              style={{
                imageRendering: 'pixelated',
                borderRadius: '25%',
                clipPath: 'circle(25%)'
              }}
            />
            <div className="preview-controls">
              <button onClick={handleRotate} className="rotate-btn">Rotate</button>
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
            {/* Removed outfit selection, mount selection, and addons sections for a cleaner interface */}
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
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-confirm" onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

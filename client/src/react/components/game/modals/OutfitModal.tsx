import React, { useState, useEffect, useRef, useCallback } from 'react';
import type GameClient from '../../../../core/gameclient';
import Outfit from '../../../../game/outfit';
import { OutfitChangePacket } from '../../../../core/protocol';
import { renderOutfitToCanvas } from '../../../../utils/outfit-renderer'; // <- helper with {faceDirection, animate, padding, background}
import BaseModal from '../../shared/BaseModal';
import './styles/OutfitModal.scss';

interface OutfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function OutfitModal({ isOpen, onClose, gc }: OutfitModalProps) {
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [faceDirection, setFaceDirection] = useState<number>(2);
  const [animate, setAnimate] = useState<boolean>(false);
  const [selectedHair, setSelectedHair] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !gc.player) return;
    const base = gc.player.outfit.copy();
    setOutfit(base);
    setFaceDirection(2);
    setAnimate(false);
    setSelectedHair(base.equipment.hair);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isOpen, gc.player]);


  const handleColorChange = (colorIndex: number) => {
    if (!outfit) return;
    const next = outfit.copy();
    next.details.head = colorIndex;
    setOutfit(next);
  };

  const handleHairChange = (hairId: number) => {
    if (!outfit) return;
    const next = outfit.copy();
    next.equipment.hair = hairId;
    setOutfit(next);
    setSelectedHair(hairId);
  };

  const handleRenderHelmetChange = (renderHelmet: boolean) => {
    if (!outfit) return;
    const next = outfit.copy();
    next.renderHelmet = renderHelmet;
    setOutfit(next);
  };

  const handleRotateLeft = () => {
    setFaceDirection(prev => (prev + 1) % 4);
  };

  const handleRotateRight = () => {
    setFaceDirection(prev => (prev - 1 + 4) % 4);
  };

  const renderOnce = useCallback(() => {
    if (!outfit || !canvasRef.current) return;
    renderOutfitToCanvas(gc, outfit, canvasRef.current, {
      faceDirection,
      animate,
      padding: 4,
      background: "transparent",
    });
  }, [gc, outfit, faceDirection, animate]);

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

  useEffect(() => {
    if (animate) return;
    renderOnce();
  }, [renderOnce, animate, outfit, faceDirection]);

  const handleConfirm = () => {
    if (!outfit || !gc.player) return onClose();

    if (!gc.player.outfit.equals(outfit)) {
      gc.send(new OutfitChangePacket(outfit));
    }
    onClose();
  };

  if (!isOpen || !gc.player || !outfit) return null;

  const footer = (
    <>
      <div className="footer-controls">
        <button 
          onClick={() => setAnimate(!animate)} 
          className={`animate-btn ${animate ? 'active' : ''}`}
        >
          Animate
        </button>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={outfit?.renderHelmet || false}
            onChange={(e) => handleRenderHelmetChange(e.target.checked)}
          />
          <span>Show Helmet</span>
        </label>
      </div>
      <div className="footer-buttons">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={handleConfirm}>Confirm</button>
      </div>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Outfit"
      footer={footer}
      size="large"
      className="outfit-modal"
    >
          
          <div className="outfit-preview">
            <canvas
              ref={canvasRef}
              width={128}
              height={128}
              className="outfit-canvas"
            />
            <div className="rotate-controls">
              <button onClick={handleRotateLeft} className="rotate-left-btn">‹</button>
              <button onClick={handleRotateRight} className="rotate-right-btn">›</button>
            </div>
          </div>

          <div className="color-picker">
            <div className="color-grid">
              {Array.from({ length: 7 }).map((_, r) =>
                Array.from({ length: 19 }).map((_, c) => {
                  const index = r * 19 + c;
                  const color = [
                    'rgb(255, 255, 255)','rgb(255, 212, 191)','rgb(255, 233, 191)','rgb(255, 255, 191)','rgb(233, 255, 191)','rgb(212, 255, 191)','rgb(191, 255, 191)','rgb(191, 255, 212)','rgb(191, 255, 233)','rgb(191, 255, 255)','rgb(191, 233, 255)','rgb(191, 212, 255)','rgb(191, 191, 255)','rgb(212, 191, 255)','rgb(233, 191, 255)','rgb(255, 191, 255)','rgb(255, 191, 233)','rgb(255, 191, 212)','rgb(255, 191, 191)',
                    'rgb(218, 218, 218)','rgb(191, 159, 143)','rgb(191, 175, 143)','rgb(191, 191, 143)','rgb(175, 191, 143)','rgb(159, 191, 143)','rgb(143, 191, 143)','rgb(143, 191, 159)','rgb(143, 191, 175)','rgb(143, 191, 191)','rgb(143, 175, 191)','rgb(143, 159, 191)','rgb(143, 143, 191)','rgb(159, 143, 191)','rgb(175, 143, 191)','rgb(191, 143, 191)','rgb(191, 143, 175)','rgb(191, 143, 159)','rgb(191, 143, 143)',
                    'rgb(182, 182, 182)','rgb(191, 127, 95)','rgb(191, 175, 143)','rgb(191, 191, 95)','rgb(159, 191, 95)','rgb(127, 191, 95)','rgb(95, 191, 95)','rgb(95, 191, 127)','rgb(95, 191, 159)','rgb(95, 191, 191)','rgb(95, 159, 191)','rgb(95, 127, 191)','rgb(95, 95, 191)','rgb(127, 95, 191)','rgb(159, 95, 191)','rgb(191, 95, 191)','rgb(191, 95, 159)','rgb(191, 95, 127)','rgb(191, 95, 95)',
                    'rgb(145, 145, 145)','rgb(191, 106, 63)','rgb(191, 148, 63)','rgb(191, 191, 63)','rgb(148, 191, 63)','rgb(106, 191, 63)','rgb(63, 191, 63)','rgb(63, 191, 106)','rgb(63, 191, 148)','rgb(63, 191, 191)','rgb(63, 148, 191)','rgb(63, 106, 191)','rgb(63, 63, 191)','rgb(106, 63, 191)','rgb(148, 63, 191)','rgb(191, 63, 191)','rgb(191, 63, 148)','rgb(191, 63, 106)','rgb(191, 63, 63)',
                    'rgb(109, 109, 109)','rgb(255, 85, 0)','rgb(255, 170, 0)','rgb(255, 255, 0)','rgb(170, 255, 0)','rgb(84, 255, 0)','rgb(0, 255, 0)','rgb(0, 255, 84)','rgb(0, 255, 170)','rgb(0, 255, 255)','rgb(0, 169, 255)','rgb(0, 85, 255)','rgb(0, 0, 255)','rgb(85, 0, 255)','rgb(169, 0, 255)','rgb(254, 0, 255)','rgb(255, 0, 170)','rgb(255, 0, 85)','rgb(255, 0, 0)',
                    'rgb(72, 72, 72)','rgb(191, 63, 0)','rgb(191, 127, 0)','rgb(191, 191, 0)','rgb(127, 191, 0)','rgb(63, 191, 0)','rgb(0, 191, 0)','rgb(0, 191, 63)','rgb(0, 191, 127)','rgb(0, 191, 191)','rgb(0, 127, 191)','rgb(0, 63, 191)','rgb(0, 0, 191)','rgb(63, 0, 191)','rgb(127, 0, 191)','rgb(191, 0, 191)','rgb(191, 0, 127)','rgb(191, 0, 63)','rgb(191, 0, 0)',
                    'rgb(36, 36, 36)','rgb(127, 42, 0)','rgb(127, 85, 0)','rgb(127, 127, 0)','rgb(85, 127, 0)','rgb(42, 127, 0)','rgb(0, 127, 0)','rgb(0, 127, 42)','rgb(0, 127, 85)','rgb(0, 127, 127)','rgb(0, 84, 127)','rgb(0, 42, 127)','rgb(0, 0, 127)','rgb(42, 0, 127)','rgb(84, 0, 127)','rgb(127, 0, 127)','rgb(127, 0, 85)','rgb(127, 0, 42)','rgb(127, 0, 0)'
                  ][index];
                  return (
                    <button
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(index)}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="hair-picker">
            <div className="hair-grid">
              {gc.player.hairs && Array.isArray(gc.player.hairs) ? gc.player.hairs.map((hair: { id: number; name: string }) => (
                <button
                  key={hair.id}
                  className={`hair-option ${selectedHair === hair.id ? 'selected' : ''}`}
                  onClick={() => handleHairChange(hair.id)}
                  title={hair.name}
                >
                  <canvas
                    width={40}
                    height={40}
                    className="hair-canvas"
                    ref={(canvas) => {
                      if (canvas && outfit) {
                        const hairOutfit = outfit.copy();
                        hairOutfit.equipment.hair = hair.id;
                        hairOutfit.details.head = 0;
                        renderOutfitToCanvas(gc, hairOutfit, canvas, {
                          faceDirection: 2,
                          animate: false,
                          padding: 4,
                          background: "transparent",
                        });
                      }
                    }}
                  />
                </button>
              )) : (
                <div className="no-hairs-message">No hairs available</div>
              )}
            </div>
          </div>

    </BaseModal>
  );
}

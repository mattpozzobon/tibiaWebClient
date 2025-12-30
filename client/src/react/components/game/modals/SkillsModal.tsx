import React from 'react';
import type GameClient from '../../../../core/gameclient';
import './styles/SkillsModal.scss';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function SkillsModal({ isOpen, onClose, gc }: SkillsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="skills-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Character Skills</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="skills-grid">
            <div className="skill-item">
              <div className="skill-name">Level</div>
              <div className="skill-value">1</div>
            </div>
            <div className="skill-item">
              <div className="skill-name">Experience</div>
              <div className="skill-value">0 / 100</div>
            </div>
            <div className="skill-item">
              <div className="skill-name">Health</div>
              <div className="skill-value">100 / 100</div>
            </div>
            <div className="skill-item">
              <div className="skill-name">Mana</div>
              <div className="skill-value">100 / 100</div>
            </div>
            <div className="skill-item">
              <div className="skill-name">Sword Fighting</div>
              <div className="skill-value">10</div>
            </div>
            <div className="skill-item">
              <div className="skill-name">Magic Level</div>
              <div className="skill-value">0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

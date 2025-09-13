import React from 'react';
import type GameClient from '../../../core/gameclient';

interface PlayerStatsProps {
  gc: GameClient;
  onClose?: () => void;
}

interface PlayerData {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  maxExperience: number;
  skills: {
    strength: number;
    intelligence: number;
    dexterity: number;
    vitality: number;
  };
}

export default function PlayerStats({ gc, onClose }: PlayerStatsProps) {
  // TODO: Get real player data from game client
  const playerData: PlayerData = {
    name: 'Player',
    level: 15,
    health: 850,
    maxHealth: 1000,
    mana: 320,
    maxMana: 400,
    experience: 7500,
    maxExperience: 10000,
    skills: {
      strength: 25,
      intelligence: 18,
      dexterity: 22,
      vitality: 30
    }
  };

  const healthPercentage = (playerData.health / playerData.maxHealth) * 100;
  const manaPercentage = (playerData.mana / playerData.maxMana) * 100;
  const experiencePercentage = (playerData.experience / playerData.maxExperience) * 100;

  return (
    <div className="player-stats">
      <div className="player-header">
        <h3>{playerData.name}</h3>
        <span className="player-level">Level {playerData.level}</span>
      </div>
      
      <div className="player-vitals">
        <div className="vital-bar">
          <div className="vital-label">Health</div>
          <div className="vital-bar-container">
            <div 
              className="vital-bar-fill health-bar"
              style={{ width: `${healthPercentage}%` }}
            />
            <span className="vital-text">
              {playerData.health} / {playerData.maxHealth}
            </span>
          </div>
        </div>
        
        <div className="vital-bar">
          <div className="vital-label">Mana</div>
          <div className="vital-bar-container">
            <div 
              className="vital-bar-fill mana-bar"
              style={{ width: `${manaPercentage}%` }}
            />
            <span className="vital-text">
              {playerData.mana} / {playerData.maxMana}
            </span>
          </div>
        </div>
        
        <div className="vital-bar">
          <div className="vital-label">Experience</div>
          <div className="vital-bar-container">
            <div 
              className="vital-bar-fill exp-bar"
              style={{ width: `${experiencePercentage}%` }}
            />
            <span className="vital-text">
              {playerData.experience} / {playerData.maxExperience}
            </span>
          </div>
        </div>
      </div>
      
      <div className="player-skills">
        <h4>Skills</h4>
        <div className="skills-grid">
          <div className="skill-item">
            <span className="skill-name">Strength</span>
            <span className="skill-value">{playerData.skills.strength}</span>
          </div>
          <div className="skill-item">
            <span className="skill-name">Intelligence</span>
            <span className="skill-value">{playerData.skills.intelligence}</span>
          </div>
          <div className="skill-item">
            <span className="skill-name">Dexterity</span>
            <span className="skill-value">{playerData.skills.dexterity}</span>
          </div>
          <div className="skill-item">
            <span className="skill-name">Vitality</span>
            <span className="skill-value">{playerData.skills.vitality}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

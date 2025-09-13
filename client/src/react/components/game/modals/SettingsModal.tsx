import React, { useState, useEffect } from 'react';
import type GameClient from '../../../../core/gameclient';
import './styles/SettingsModal.scss';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
}

export default function SettingsModal({ isOpen, onClose, gc }: SettingsModalProps) {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    musicEnabled: true,
    showNames: true,
    showHealthBars: true,
    autoChase: false,
    showTimestamp: false,
    showLevel: true,
    showHits: true,
    showText: true,
    showIcons: true,
    showLoot: true,
    showPrivateMessages: true,
    showSystemMessages: true,
    showGuildMessages: true,
    showPartyMessages: true,
    showNPCsMessages: true,
    showAnimatedText: true,
    showFPS: false,
    showPing: false,
    showClock: false,
    showCompass: false,
    showMinimap: true,
    showHotkeys: true,
    showStatusBar: true,
    showInventory: true,
    showChat: true,
    showSkills: true,
    showOutfit: true,
    showMap: true,
    showSpells: true,
    showFriends: true,
    showBattle: true,
    showOffer: true,
    showMoveItem: true,
    showConfirm: true,
    showEnterName: true,
    showReadable: true,
    showSpellbook: true,
  });

  useEffect(() => {
    if (isOpen) {
      // Load settings from game client or localStorage
      const savedSettings = localStorage.getItem('game-settings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    }
  }, [isOpen]);

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('game-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const handleSave = () => {
    // Apply settings to game client
    if (gc && gc.interface) {
      // TODO: Implement settings application when the game client methods are available
      console.log('Settings saved:', settings);
      
      // For now, just save to localStorage
      localStorage.setItem('game-settings', JSON.stringify(settings));
    }
    onClose();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        soundEnabled: true,
        musicEnabled: true,
        showNames: true,
        showHealthBars: true,
        autoChase: false,
        showTimestamp: false,
        showLevel: true,
        showHits: true,
        showText: true,
        showIcons: true,
        showLoot: true,
        showPrivateMessages: true,
        showSystemMessages: true,
        showGuildMessages: true,
        showPartyMessages: true,
        showNPCsMessages: true,
        showAnimatedText: true,
        showFPS: false,
        showPing: false,
        showClock: false,
        showCompass: false,
        showMinimap: true,
        showHotkeys: true,
        showStatusBar: true,
        showInventory: true,
        showChat: true,
        showSkills: true,
        showOutfit: true,
        showMap: true,
        showSpells: true,
        showFriends: true,
        showBattle: true,
        showOffer: true,
        showMoveItem: true,
        showConfirm: true,
        showEnterName: true,
        showReadable: true,
        showSpellbook: true,
      });
      localStorage.removeItem('game-settings');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Game Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="settings-sections">
            {/* Audio Settings */}
            <div className="settings-section">
              <h3>Audio</h3>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                  />
                  Enable Sound Effects
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.musicEnabled}
                    onChange={(e) => handleSettingChange('musicEnabled', e.target.checked)}
                  />
                  Enable Music
                </label>
              </div>
            </div>

            {/* Display Settings */}
            <div className="settings-section">
              <h3>Display</h3>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showNames}
                    onChange={(e) => handleSettingChange('showNames', e.target.checked)}
                  />
                  Show Player Names
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showHealthBars}
                    onChange={(e) => handleSettingChange('showHealthBars', e.target.checked)}
                  />
                  Show Health Bars
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showFPS}
                    onChange={(e) => handleSettingChange('showFPS', e.target.checked)}
                  />
                  Show FPS
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showPing}
                    onChange={(e) => handleSettingChange('showPing', e.target.checked)}
                  />
                  Show Ping
                </label>
              </div>
            </div>

            {/* Chat Settings */}
            <div className="settings-section">
              <h3>Chat</h3>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showTimestamp}
                    onChange={(e) => handleSettingChange('showTimestamp', e.target.checked)}
                  />
                  Show Timestamps
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showPrivateMessages}
                    onChange={(e) => handleSettingChange('showPrivateMessages', e.target.checked)}
                  />
                  Show Private Messages
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showSystemMessages}
                    onChange={(e) => handleSettingChange('showSystemMessages', e.target.checked)}
                  />
                  Show System Messages
                </label>
              </div>
            </div>

            {/* Gameplay Settings */}
            <div className="settings-section">
              <h3>Gameplay</h3>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoChase}
                    onChange={(e) => handleSettingChange('autoChase', e.target.checked)}
                  />
                  Auto Chase
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showLoot}
                    onChange={(e) => handleSettingChange('showLoot', e.target.checked)}
                  />
                  Show Loot
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>
            Reset to Default
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

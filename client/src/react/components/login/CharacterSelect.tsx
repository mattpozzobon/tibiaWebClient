import React, { useState, useEffect } from "react";
import type GameClient from "../../../core/gameclient";
import './styles/CharacterSelect.scss';

interface CharacterSelectProps {
  gc: GameClient;
  onCharacterSelected: () => void;
}

interface Character {
  id: number;
  name: string;
  sex: 'male' | 'female';
  role: number;
}

export default function CharacterSelect({ gc, onCharacterSelected }: CharacterSelectProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load characters from the game client
    loadCharacters();
  }, [gc]);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      // Get characters from LoginFlowManager (populated by server handshake)
      const loginFlowManager = gc.interface.loginFlowManager;
      
      // Wait for characters to be loaded from server
      const waitForCharacters = () => {
        return new Promise<Character[]>((resolve) => {
          const checkForCharacters = () => {
            // Access the private loginInfo through the interface
            const loginInfo = (loginFlowManager as any).loginInfo;
            if (loginInfo && loginInfo.characters && loginInfo.characters.length > 0) {
              resolve(loginInfo.characters);
            } else {
              setTimeout(checkForCharacters, 500);
            }
          };
          checkForCharacters();
        });
      };
      
      const serverCharacters = await waitForCharacters();
      setCharacters([...serverCharacters]); // Force new array reference
    } catch (err: any) {
      console.error('❌ Error loading characters:', err);
      setError("Failed to load characters: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterSelect = (characterId: number) => {
    setSelectedCharacter(characterId);
  };

  const handleEnterGame = async () => {
    if (!selectedCharacter) return;

    try {
      setLoading(true);
      
      // Get login info from LoginFlowManager
      const loginFlowManager = gc.interface.loginFlowManager;
      const loginInfo = (loginFlowManager as any).loginInfo;
      
      if (loginInfo && loginInfo.token && loginInfo.gameHost) {
        // Close any open modals first (like the original system)
        gc.interface.modalManager.close();
        
        // Connect to game server with selected character
        gc.networkManager.connectGameServer(loginInfo.gameHost, loginInfo.token, selectedCharacter);
        
        // Call the callback to switch to game view (handles UI transition)
        onCharacterSelected();
      } else {
        throw new Error("Missing login information - token or gameHost not found");
      }
    } catch (err: any) {
      console.error('❌ Failed to enter game:', err);
      setError("Failed to enter game: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="character-select-loading">
        <div className="loading-spinner"></div>
        <p>Loading characters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="character-select-error">
        <p className="error-message">{error}</p>
        <button onClick={loadCharacters} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="character-select-container">
      <h2 className="character-select-title">
        Select Character
      </h2>
      
      <div className="character-grid">
        {characters.map((character) => (
          <div
            key={`char-${character.id}`}
            onClick={() => handleCharacterSelect(character.id)}
            className={`character-card ${selectedCharacter === character.id ? 'selected' : ''}`}
          >
            <div className="character-name">{character.name}</div>
            <div className="character-level">Level 1</div>
            <div className="character-vocation">Knight</div>
          </div>
        ))}
      </div>
      
      <button 
        onClick={handleEnterGame}
        disabled={!selectedCharacter || loading}
        className={`character-select-button ${!selectedCharacter ? 'disabled' : ''}`}
      >
        {loading ? "Entering..." : selectedCharacter ? "GO!" : "Select a character"}
      </button>
      
      {error && (
        <div className="character-select-error">
          {error}
        </div>
      )}
    </div>
  );
}

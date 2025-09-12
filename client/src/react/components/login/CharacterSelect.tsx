import React, { useState, useEffect } from "react";
import type GameClient from "../../../core/gameclient";

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
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80%',
      maxWidth: '800px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '3px solid #333',
      borderRadius: '10px',
      padding: '30px',
      zIndex: 10000
    }}>
      <h2 style={{ 
        color: 'white', 
        textAlign: 'center', 
        marginBottom: '20px',
        fontSize: '24px'
      }}>
        Select Character
      </h2>
      
      
      <div style={{
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginBottom: '30px'
      }}>
        {characters.map((character) => (
          <div
            key={`char-${character.id}`}
            onClick={() => handleCharacterSelect(character.id)}
            style={{
              width: '150px',
              height: '180px',
              backgroundColor: selectedCharacter === character.id ? 'rgba(0, 150, 255, 0.8)' : 'rgba(50, 50, 50, 0.8)',
              border: selectedCharacter === character.id ? '3px solid #0096ff' : '2px solid #666',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '10px',
              transition: 'all 0.3s ease'
            }}
          >
            {character.name}
          </div>
        ))}
      </div>
      
      <button 
        onClick={handleEnterGame}
        disabled={!selectedCharacter || loading}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '20px',
          fontWeight: 'bold',
          backgroundColor: selectedCharacter ? '#00ff00' : '#666',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: selectedCharacter ? 'pointer' : 'not-allowed',
          marginTop: '20px'
        }}
      >
        {loading ? "Entering..." : selectedCharacter ? "GO!" : "Select a character"}
      </button>
      
      {error && (
        <div style={{ 
          color: 'red', 
          marginTop: '15px', 
          textAlign: 'center',
          fontSize: '16px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

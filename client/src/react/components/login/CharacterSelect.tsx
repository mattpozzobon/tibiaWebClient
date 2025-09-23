import React, { useEffect, useState } from "react";
import type GameClient from "../../../core/gameclient";
import './styles/CharacterSelect.scss';

interface CharacterSelectProps {
  gc: GameClient | null;
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

  // Load characters once gc is available and the socket populated login info
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        if (!gc) {
          // engine not ready yet, keep a small spinner
          return;
        }

        const loginFlowManager = gc.interface.loginFlowManager;
        // wait until server pushed login info
        const waitForChars = () =>
          new Promise<Character[]>((resolve) => {
            const tick = () => {
              const info = (loginFlowManager as any).loginInfo;
              if (info?.characters?.length) return resolve(info.characters);
              setTimeout(tick, 200);
            };
            tick();
          });

        const chars = await waitForChars();
        if (!cancelled) {
          setCharacters(chars.slice());
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load characters');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [gc]);

  const handleEnterGame = async () => {
    if (!selectedCharacter || !gc) return;
    try {
      setLoading(true);
      const info = (gc.interface.loginFlowManager as any).loginInfo;
      if (!info?.token || !info?.gameHost) throw new Error('Missing login info');
      gc.networkManager.connectGameServer(info.gameHost, info.token, selectedCharacter);
      onCharacterSelected();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to enter game');
    } finally {
      setLoading(false);
    }
  };

  if (!gc || loading) {
    return (
      <div className="character-select-loading">
        <div className="loading-spinner"></div>
        <p>{gc ? 'Loading characters…' : 'Starting engine…'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="character-select-error">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="character-select-container">
      <h2 className="character-select-title">Select Character</h2>
      <div className="character-grid">
        {characters.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedCharacter(c.id)}
            className={`character-card ${selectedCharacter === c.id ? 'selected' : ''}`}
          >
            <div className="character-name">{c.name}</div>
            <div className="character-level">Level 1</div>
            <div className="character-vocation">Knight</div>
          </div>
        ))}
      </div>
      <button
        onClick={handleEnterGame}
        disabled={!selectedCharacter}
        className={`character-select-button ${!selectedCharacter ? 'disabled' : ''}`}
      >
        {selectedCharacter ? 'GO!' : 'Select a character'}
      </button>
    </div>
  );
}

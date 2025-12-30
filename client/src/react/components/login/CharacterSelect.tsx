import React, { useEffect, useState } from "react";
import type GameClient from "../../../core/gameclient";
// Removed modal import as it's not used here anymore
import { renderOutfitToCanvas } from "../../../utils/outfit-renderer";
import Outfit from "../../../game/outfit";
import './styles/CharacterSelect.scss';

interface CharacterSelectProps {
  gc: GameClient | null;
  onCharacterSelected: () => void;
  onLogout?: () => void;
}

interface Character {
  id: number;
  name: string;
  sex: 'male' | 'female';
  role: number;
  level: number;
  outfit: {
    id: number;
    addons: {
      healthPotion: number;
      manaPotion: number;
      energyPotion: number;
      bag: number;
    };
    details: {
      head: number;
      body: number;
      legs: number;
      feet: number;
    };
    equipment: {
      hair: number;
      head: number;
      body: number;
      legs: number;
      feet: number;
      lefthand: number;
      righthand: number;
    };
    mount: number;
    mounted: boolean;
  };
}

export default function CharacterSelect({ gc, onCharacterSelected, onLogout }: CharacterSelectProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createCharacterSlot, setCreateCharacterSlot] = useState<number | null>(null);
  const [createCharacterData, setCreateCharacterData] = useState({ name: '', sex: 'male' as 'male' | 'female' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function OutfitPreview({ outfit }: { outfit: Character['outfit'] }) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
      if (!gc || !outfit || !canvasRef.current) return;
      // Best-effort render. The outfit object from server mirrors runtime outfit
      try {
        const normalized = outfit instanceof Object && (outfit as any).getHairDataObject ? (outfit as any) : new Outfit(outfit as any);
        renderOutfitToCanvas(gc, normalized as any, canvasRef.current, {
          faceDirection: 2,
          animate: false,
          padding: 2,
          background: "transparent",
        });
      } catch {
        // ignore render errors in preview
      }
    }, [gc, outfit]);

    return (
      <canvas
        ref={canvasRef}
        width={256}
        height={256}
        className="outfit-preview-canvas"
      />
    );
  }

  // Load characters from server
  useEffect(() => {
    let cancelled = false;

    const loadCharacters = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          throw new Error("No auth token found");
        }

        // Get login host from gc or use default
        const loginHost = (gc?.interface?.loginFlowManager as any)?.loginInfo?.loginHost || "127.0.0.1:3000";
        
        const response = await fetch(`http://${loginHost}/characters?token=${encodeURIComponent(token)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch characters: ${response.status}`);
        }

        const chars = await response.json();
        if (!cancelled) setCharacters(chars || []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load characters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCharacters();
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

  const handleCreateCharacter = async () => {
    // Client-side normalization and validation mirroring server rules
    const rawName = createCharacterData.name ?? '';
    const normalizedName = rawName.trim().replace(/\s+/g, ' ');
    const sex = createCharacterData.sex;

    // Reset create error
    setCreateError(null);

    if (!normalizedName || !sex || (sex !== 'male' && sex !== 'female')) {
      setCreateError('Invalid character data');
      return;
    }
    if (normalizedName.length > 20) {
      setCreateError('Name too long (max 20)');
      return;
    }
    if (!/^[A-Za-z ]+$/.test(normalizedName)) {
      setCreateError('Invalid characters in name');
      return;
    }
    if (!/[A-Za-z]/.test(normalizedName)) {
      setCreateError('Name must contain letters');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const loginHost = (gc?.interface?.loginFlowManager as any)?.loginInfo?.loginHost || '127.0.0.1:3000';

      const response = await fetch(`http://${loginHost}/characters/create?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, sex })
      });

      if (!response.ok) {
        // Prefer server-provided message
        const serverText = await response.text().catch(() => '');
        const message = serverText || `Failed to create character (${response.status})`;
        setCreateError(message);
        return;
      }

      // Refresh character list
      const listResponse = await fetch(`http://${loginHost}/characters?token=${encodeURIComponent(token)}`);
      if (listResponse.ok) {
        const chars = await listResponse.json();
        setCharacters(chars || []);
      }

      setCreateCharacterSlot(null);
      setCreateCharacterData({ name: '', sex: 'male' });
      setCreateError(null);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create character');
    } finally {
      setCreating(false);
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
      <div className="character-select-loading">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    );
  }

  // Create array of 5 slots, filling empty ones with null
  const characterSlots = Array.from({ length: 5 }, (_, index) => characters[index] || null);

  return (
    <div className="character-select-container">
      <h2 className="character-select-title">Select Character</h2>
      {loading && <div className="loading">Loading characters...</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="character-grid-horizontal">
        {characterSlots.map((character, index) => (
          <div
            key={index}
            className={`character-card-flip ${character && selectedCharacter === character.id ? 'selected' : ''} ${createCharacterSlot === index ? 'flipped' : ''}`}
            onClick={() => {
              if (character && createCharacterSlot !== index) {
                setSelectedCharacter(character.id);
              }
            }}
          >
            <div className="card-inner">
              {/* Front side - Character display */}
              <div className="card-front">
                {character ? (
                  <div className="character-front">
                    <div className="character-name character-name-top">{character.name}</div>
                    <div className="character-visual">
                      <OutfitPreview outfit={character.outfit} />
                    </div>
                    <div className="character-info character-info-bottom">
                      <div className="character-level">Level {character.level}</div>
                      <div className={`character-gender ${character.sex}`}>{character.sex}</div>
                    </div>
                  </div>
                ) : (
                  <div className="create-character-card" onClick={() => setCreateCharacterSlot(index)}>
                    <div className="create-character-icon">+</div>
                    <div className="create-character-text">Create Character</div>
                  </div>
                )}
              </div>

              {/* Back side - Create character form */}
              <div className="card-back">
                <div className="create-character-form">
                  <h4>Create Character</h4>
                  {createError && (
                    <div className="create-error" role="alert">{createError}</div>
                  )}
                  <div className="form-group">
                    <input
                      type="text"
                      value={createCharacterData.name}
                      onChange={(e) => setCreateCharacterData({...createCharacterData, name: e.target.value})}
                      placeholder="Character name"
                      maxLength={20}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <select
                      value={createCharacterData.sex}
                      onChange={(e) => setCreateCharacterData({...createCharacterData, sex: e.target.value as 'male' | 'female'})}
                      className="form-select"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateCharacter();
                      }}
                      disabled={!createCharacterData.name.trim() || creating}
                      className="btn-create"
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateCharacterSlot(null);
                        setCreateCharacterData({ name: '', sex: 'male' });
                      }}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCharacter && (
        <button
          onClick={handleEnterGame}
          disabled={loading}
          className="character-select-button"
        >
          {loading ? 'Entering...' : 'GO!'}
        </button>
      )}

    </div>
  );
}

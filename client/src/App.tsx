import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import LoginFlow from './react/components/login/LoginFlow';
import GameLayout from './react/components/game/GameLayout';
import { GameClientProvider } from './react/hooks/gameClientCtx';
import type GameClient from './core/gameclient';
import { useGameClient } from './useGameClient';

import '../css/critical.css';
import '../css/base-components.css';
import '../css/screen-element.css';
import '../css/canvas.css';
import '../css/new.css';
import '../css/react-components.css';


declare global {
  interface Window {
    gameClient: GameClient;
    updateProgress?: (progress: number, text: string) => void;
  }
}

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [characterChosen, setCharacterChosen] = useState(false);

  useEffect(() => {
    const token = !!localStorage.getItem('auth_token');
    setIsAuthenticated(token);
    setIsInitialized(true);
  }, []);

  const shouldInitEngine = isInitialized && isAuthenticated;
  const { gc, status: engineStatus, error: engineError } = useGameClient(shouldInitEngine);

  const callbacks = useMemo(
    () => ({
      onGameStart: () => setIsAuthenticated(true),   
      onCharacterSelected: () => setCharacterChosen(true),
    }),
    []
  );


  return (
    <>
      {isAuthenticated && (
        <GameClientProvider gc={gc}>
          <GameLayout />
        </GameClientProvider>
      )}


      {!characterChosen && (
          <LoginFlow gc={gc} engineStatus={engineStatus} onGameStart={callbacks.onGameStart} onCharacterSelected={callbacks.onCharacterSelected}/>
      )}

    </>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (!container) return console.error('Root container not found!');
  createRoot(container).render(<App />);
});

export default App;

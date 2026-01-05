import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import LoginFlow from './react/components/login/LoginFlow';
import GameLayout from './react/components/game/GameLayout';
import { GameClientProvider } from './react/hooks/gameClientCtx';
import type GameClient from './core/gameclient';
import { useGameClient } from './useGameClient';

import '../css/critical.css';
import '../css/base-components.css';


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
    // Check both sessionStorage and localStorage for auth token
    const token = !!(sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token'));
    setIsAuthenticated(token);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // Listen for game disconnect events
    const handleDisconnect = (event: CustomEvent) => {
      console.log('Game disconnected:', event.detail?.reason || 'Unknown reason');
      
      // Clear authentication state
      setIsAuthenticated(false);
      setCharacterChosen(false);
      
      // Clear tokens
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Clear login info if gameClient exists
      if (window.gameClient?.interface?.loginFlowManager) {
        (window.gameClient.interface.loginFlowManager as any).clearLoginInfo?.();
      }
      
      // Destroy game client completely - this will trigger reinitialization
      if (window.gameClient) {
        window.gameClient.destroy();
        // Clear the gc state to trigger reinitialization in useGameClient
        // We do this by setting shouldInitEngine to false temporarily
        // The next login will set isAuthenticated back to true, triggering reinit
      }
    };

    window.addEventListener('game-disconnect', handleDisconnect as EventListener);
    
    return () => {
      window.removeEventListener('game-disconnect', handleDisconnect as EventListener);
    };
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

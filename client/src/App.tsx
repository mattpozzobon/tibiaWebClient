import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import GameClient from './core/gameclient';
import Renderer from './renderer/renderer';

// Import React components
import LoginFlow from './react/components/login/LoginFlow';
import GameLayout from './react/components/game/GameLayout';

// Import core CSS files
import '../css/critical.css';
import '../css/base-components.css';
import '../css/screen-element.css';
import '../css/canvas.css';
import '../css/new.css';
import '../css/react-components.css';

// Extend the existing Window interface
declare global {
  interface Window {
    updateProgress?: (progress: number, text: string) => void;
    gameClient: GameClient;
  }
}

interface AppProps {
  onProgressUpdate?: (progress: number, text: string) => void;
}

const App: React.FC<AppProps> = ({ onProgressUpdate }) => {
  const [loading, setLoading] = useState({ 
    isLoading: true, 
    progress: 0, 
    text: 'Initializing...' 
  });
  const [gameClient, setGameClient] = useState<GameClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const updateProgress = (progress: number, text: string) => {
    setLoading(prev => ({ ...prev, progress, text }));
    onProgressUpdate?.(progress, text);
    window.updateProgress?.(progress, text);
  };

  const hideLoadingScreen = () => {
    setLoading(prev => ({ ...prev, isLoading: false }));
  };

  const loadGameComponents = async () => {
    updateProgress(80, 'Game components ready');
    setComponentsLoaded(true);
  };

  const bootstrapGame = async () => {
    updateProgress(90, 'Loading game engine...');
    
    // Wait for the game-container DOM element to exist (React components must be rendered first)
    const waitForGameContainer = () => {
      return new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 5 seconds max wait time
        
        const checkContainer = () => {
          attempts++;
          const gameContainer = document.getElementById('game-container');
          if (gameContainer) {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('Game container not found after 5 seconds'));
          } else {
            setTimeout(checkContainer, 50);
          }
        };
        checkContainer();
      });
    };
    
    await waitForGameContainer();
    
    const renderer = await Renderer.create();
    const gameClient = new GameClient(renderer);
    window.gameClient = gameClient;
    
    // Wait for game client to be fully initialized
    const waitForGameClient = () => {
      if (window?.gameClient?.interface) {
        window.gameClient.interface.enableTopbarListeners();
        window.gameClient.interface.modalManager.addEventListeners();
        setGameClient(window.gameClient);
      } else {
        setTimeout(waitForGameClient, 50);
      }
    };
    
    waitForGameClient();
  };

  useEffect(() => {
    const initializeApp = () => {
      updateProgress(10, 'Initializing...');
      
      // Clear auth token for testing - remove this in production
      localStorage.removeItem("auth_token");
      
      // Check authentication status
      const authed = !!localStorage.getItem("auth_token");
      setIsAuthenticated(authed);
      
      if (authed) {
        loadGameComponents();
      }
      
      updateProgress(100, 'Ready!');
      hideLoadingScreen();
    };

    initializeApp();
  }, []);

  useEffect(() => {
    const checkAuthStatus = () => {
      const authed = !!localStorage.getItem("auth_token");
      if (authed && !isAuthenticated) {
        loadGameComponents();
        setIsAuthenticated(true);
      }
    };

    // Check every 500ms for auth changes
    const interval = setInterval(checkAuthStatus, 500);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && componentsLoaded && !gameClient) {
      const initGameClient = async () => {
        // Small delay to ensure React has rendered GameLayout component
        await new Promise(resolve => setTimeout(resolve, 100));
        await bootstrapGame();
        if (window.gameClient) {
          setGameClient(window.gameClient);
        }
      };
      
      initGameClient();
    }
  }, [isAuthenticated, componentsLoaded]);

  const handleGameStart = () => {
    setIsAuthenticated(true);
    loadGameComponents();
  };

  const handleCharacterSelected = () => {
    setGameStarted(true);
  };

  if (loading.isLoading) {
    return (
      <div id="loading-screen">
        <div className="loading-logo"></div>
        <div className="loading-spinner"></div>
        <div className="loading-text">{loading.text}</div>
        <div className="loading-progress">
          <div 
            className="loading-progress-bar" 
            style={{ width: `${loading.progress}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // Create LoginFlow component with consistent styling
  const loginFlowComponent = (
    <div 
      id="login-page-container" 
      style={{ 
        display: (!isAuthenticated || !gameStarted) ? 'block' : 'none', 
        visibility: (!isAuthenticated || !gameStarted) ? 'visible' : 'hidden' 
      }}
    >
      <LoginFlow onGameStart={handleGameStart} onCharacterSelected={handleCharacterSelected} />
    </div>
  );

  if (!isAuthenticated) {
    return loginFlowComponent;
  }

  return (
    <>
      {loginFlowComponent}
      
      {/* Game Layout - render when authenticated to create DOM elements */}
      {isAuthenticated && <GameLayout gameClient={gameClient} />}
    </>
  );
};

// Mount the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  } else {
    console.error('Root container not found!');
  }
});

export default App;

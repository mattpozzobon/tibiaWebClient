import React, { useState, useEffect } from 'react';
import type GameClient from '../../../core/gameclient';
import AudioManager from './AudioManager';
import GameCanvas from './GameCanvas';
import StandaloneComponents from './StandaloneComponents';
import GameWindows from './GameWindows';
import { layoutManager, type LayoutManagerState } from '../../services/LayoutManager';
import './styles/GameLayout.scss';
import GameUIManager from './GameUIManager';

interface GameLayoutProps {
  gameClient: GameClient | null;
}

const GameLayout: React.FC<GameLayoutProps> = ({ gameClient }) => {
  const [layoutState, setLayoutState] = useState<LayoutManagerState>(layoutManager.getState());

  // Subscribe to layout manager changes
  useEffect(() => {
    const unsubscribe = layoutManager.subscribe(setLayoutState);
    return unsubscribe;
  }, []);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        layoutManager.closeLastModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Expose layout manager globally for game client access
  useEffect(() => {
    if (gameClient) {
      (window as any).gameLayoutManager = layoutManager;
    }
  }, [gameClient]);

  return (
    <>
      
      <AudioManager />
      
      <GameCanvas />

      {gameClient && (
        <>
          <StandaloneComponents gameClient={gameClient} /> 
          <GameUIManager gc={gameClient} />
          {/* <Modals modals={layoutState.modals}onCloseModal={(id) => layoutManager.closeModal(id)}/> */}
          <GameWindows gameWindows={layoutState.gameWindows} onCloseWindow={(id) => layoutManager.removeGameWindow(id)}/> 
        </>
      )}
      
    </>
  );
};

export default GameLayout;

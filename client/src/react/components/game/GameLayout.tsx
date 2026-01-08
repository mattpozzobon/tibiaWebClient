// GameLayout.tsx
import React, { useEffect, useRef } from 'react';
import AudioManager from './AudioManager';
import './styles/GameLayout.scss';
import GameUIManager from './GameUIManager';
import Hud from './HudComponents';
import NotificationManager from './NotificationManager';
import { useGameClient } from '../../hooks/gameClientCtx';
import { WindowManager, WindowInitializer } from './windows';


const GameLayout: React.FC = () => {
  const gc = useGameClient(); // read the live GameClient
  const gameContentRef = useRef<HTMLDivElement>(null);
  const windowManagerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateGameContentPosition = () => {
      if (!gameContentRef.current || !windowManagerRef.current) return;

      const windowManager = windowManagerRef.current;
      const leftPanelGroup = windowManager.querySelector('.window-panel-group-left') as HTMLElement;
      const rightPanelGroup = windowManager.querySelector('.window-panel-group-right') as HTMLElement;

      let leftOffset = 0;
      let rightOffset = 0;

      // Calculate left offset based on visible columns
      if (leftPanelGroup) {
        const leftColumns = Array.from(leftPanelGroup.querySelectorAll('.window-column')).filter((col) => {
          const element = col as HTMLElement;
          return element.offsetParent !== null && window.getComputedStyle(element).display !== 'none';
        });
        leftOffset = leftColumns.length * 198; // Each column is 198px wide
      }

      // Calculate right offset based on visible columns
      if (rightPanelGroup) {
        const rightColumns = Array.from(rightPanelGroup.querySelectorAll('.window-column')).filter((col) => {
          const element = col as HTMLElement;
          return element.offsetParent !== null && window.getComputedStyle(element).display !== 'none';
        });
        rightOffset = rightColumns.length * 198; // Each column is 198px wide
      }

      // Update game-content position
      if (gameContentRef.current) {
        gameContentRef.current.style.left = `${leftOffset}px`;
        gameContentRef.current.style.right = `${rightOffset}px`;
        gameContentRef.current.style.width = `calc(100vw - ${leftOffset + rightOffset}px)`;
      }
    };

    // Initial update with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateGameContentPosition, 100);

    // Watch for changes in window columns
    const observer = new MutationObserver(() => {
      // Debounce updates
      clearTimeout(timeoutId);
      setTimeout(updateGameContentPosition, 50);
    });
    
    if (windowManagerRef.current) {
      observer.observe(windowManagerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    // Also update on window resize
    window.addEventListener('resize', updateGameContentPosition);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', updateGameContentPosition);
    };
  }, [gc]);

  return (
    <>
      <AudioManager />
      <div id="game-container"></div>
      <div id="debug-statistics"></div>
      <NotificationManager />
      <div id="achievement" className="canvas-notification hidden"></div>

      {gc && (
        <div className="game-layout">
          <div ref={gameContentRef} className="game-content">
            <Hud />
            <GameUIManager />
          </div>
          <div ref={windowManagerRef}>
            <WindowManager gc={gc}>
              <WindowInitializer gc={gc} />
            </WindowManager>
          </div>
        </div>
      )}
    </>
  );
};

export default GameLayout;

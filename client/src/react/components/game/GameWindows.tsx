import React from 'react';

interface GameWindow {
  id: string;
  component: React.ReactNode;
  position: 'left' | 'right';
  visible: boolean;
}

interface GameWindowsProps {
  gameWindows: GameWindow[];
  onCloseWindow: (id: string) => void;
}

const GameWindows: React.FC<GameWindowsProps> = ({ gameWindows, onCloseWindow }) => {
  return (
    <>
      {/* Game Windows - Left Column */}
      <div id="game-windows-left" className="game-windows-column left">
        {gameWindows
          .filter(window => window.position === 'left' && window.visible)
          .map(window => (
            <div key={window.id} className="game-window">
              {window.component}
            </div>
          ))
        }
      </div>
      
      {/* Game Windows - Right Column */}
      <div id="game-windows-right" className="game-windows-column right">
        {gameWindows
          .filter(window => window.position === 'right' && window.visible)
          .map(window => (
            <div key={window.id} className="game-window">
              {window.component}
            </div>
          ))
        }
      </div>
    </>
  );
};

export default GameWindows;

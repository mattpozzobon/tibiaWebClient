import React from 'react';
import { createRoot } from 'react-dom/client';
import type GameClient from './core/gameclient';

// Import React components
import TopbarIsland from './react/TopbarIsland';
import LoginFlow from './react/components/login/LoginFlow';
import GameUI from './react/components/game/GameUI';

// Extend the existing Window interface
declare global {
  interface Window {
    updateProgress?: (progress: number, text: string) => void;
  }
}

function whenGameReady(): Promise<GameClient | null> {
  return new Promise(resolve => {
    const hit = () => { 
      if (window.gameClient) {
        console.log('🟢 gameClient ready');
        resolve(window.gameClient); 
      }
    };
    
    // Check immediately
    hit();
    
    // Check periodically
    const id = setInterval(() => { 
      if (window.gameClient) { 
        clearInterval(id); 
        resolve(window.gameClient); 
      }
    }, 50);
    
    // Also listen for events
    document.addEventListener("DOMContentLoaded", hit);
    window.addEventListener("load", hit);
    
    // Timeout after 5 seconds - shorter timeout since React loads first
    setTimeout(() => {
      clearInterval(id);
      console.log('ℹ️ Game client not ready yet, mounting React components without it (normal for login flow)');
      resolve(null);
    }, 5000);
  });
}

function hideLoading() {
  const el = document.getElementById("loading-screen");
  if (!el) return;
  el.classList.add("hidden");
  setTimeout(() => { el.style.display = "none"; }, 500);
}

async function mountReactComponents() {
  try {
    console.log('🚀 Starting React components setup...');
    
    // FORCE LOGIN PAGE FOR TESTING - Clear auth token
    localStorage.removeItem("auth_token");
    const authed = !!localStorage.getItem("auth_token");
    console.log('🔐 Auth status:', authed);
    
    if (authed) {
      console.log('🎯 Mounting React components for authenticated user...');
      
      // Wait for game client to be ready for authenticated users
      const gc = await whenGameReady();
      console.log('🎮 Game client ready:', !!gc);
      
      if (gc) {
        // Show the game interface
        const gameWrapper = document.getElementById('game-wrapper');
        if (gameWrapper) {
          gameWrapper.style.display = 'flex';
          console.log('🎮 Game wrapper made visible');
        }
        
        // Hide login interface
        const loginContainer = document.getElementById('login-page-container');
        if (loginContainer) {
          loginContainer.style.display = 'none';
          console.log('🔒 Login container hidden');
        }
        
        // Mount topbar
        const topbarContainer = document.getElementById('topbar-container');
        if (topbarContainer) {
          const topbarRoot = createRoot(topbarContainer);
          topbarRoot.render(<TopbarIsland gc={gc} />);
          console.log('📊 Topbar mounted');
        }
        
        // Mount game UI
        const gameUIContainer = document.getElementById('game-ui-container');
        if (gameUIContainer) {
          const gameUIRoot = createRoot(gameUIContainer);
          gameUIRoot.render(<GameUI gc={gc} />);
          console.log('🎯 Game UI mounted');
        }
      } else {
        console.log('⚠️ Game client not ready yet, will retry when it loads');
        // Set up a listener for when game client becomes available
        const checkForGameClient = () => {
          if (window.gameClient) {
            console.log('🎮 Game client became available, mounting components...');
            
            // Show the game interface
            const gameWrapper = document.getElementById('game-wrapper');
            if (gameWrapper) {
              gameWrapper.style.display = 'flex';
              console.log('🎮 Game wrapper made visible');
            }
            
            // Hide login interface
            const loginContainer = document.getElementById('login-page-container');
            if (loginContainer) {
              loginContainer.style.display = 'none';
              console.log('🔒 Login container hidden');
            }
            
            const topbarContainer = document.getElementById('topbar-container');
            if (topbarContainer) {
              const topbarRoot = createRoot(topbarContainer);
              topbarRoot.render(<TopbarIsland gc={window.gameClient} />);
              console.log('📊 Topbar mounted');
            }
            
            const gameUIContainer = document.getElementById('game-ui-container');
            if (gameUIContainer) {
              const gameUIRoot = createRoot(gameUIContainer);
              gameUIRoot.render(<GameUI gc={window.gameClient} />);
              console.log('🎯 Game UI mounted');
            }
          } else {
            setTimeout(checkForGameClient, 100);
          }
        };
        checkForGameClient();
      }
    } else {
      console.log('📝 Mounting React login flow for unauthenticated user...');
      
      // Make sure login container is visible
      const loginContainer = document.getElementById('login-page-container');
      console.log('🔍 Login container found:', !!loginContainer);
      if (loginContainer) {
        loginContainer.style.display = 'block';
        loginContainer.style.visibility = 'visible';
        console.log('🔍 Login container made visible');
        
        const loginRoot = createRoot(loginContainer);
        loginRoot.render(
          <LoginFlow 
            onGameStart={() => {
              // Hide the login container and show the game wrapper
              const loginContainer = document.getElementById('login-page-container');
              const gameWrapper = document.getElementById('game-wrapper');
              
              if (loginContainer) {
                loginContainer.style.display = 'none';
              }
              
              if (gameWrapper) {
                gameWrapper.style.display = 'flex';
                
                // Mount the React Game UI components
                mountGameUI();
              }
            }} 
          />
        );
      } else {
        console.error('❌ Login container not found!');
      }
    }

    hideLoading();
    console.log('✅ React components setup complete');
    
  } catch (error) {
    console.error('❌ Error setting up React components:', error);
    hideLoading();
  }
}

// Function to mount game UI components
function mountGameUI() {
  try {
    console.log('🎮 Mounting React Game UI components...');
    
    // Check if game client is ready
    if (!window.gameClient) {
      console.log('⏳ Game client not ready yet, waiting...');
      
      const checkForGameClient = () => {
        if (window.gameClient) {
          console.log('✅ Game client ready, mounting Game UI');
          mountGameUIComponents();
        } else {
          setTimeout(checkForGameClient, 100);
        }
      };
      
      checkForGameClient();
      return;
    }
    
    mountGameUIComponents();
    
  } catch (error) {
    console.error('❌ Error mounting game UI:', error);
  }
}

function mountGameUIComponents() {
  // Create a container for the game UI if it doesn't exist
  let gameUIContainer = document.getElementById('game-ui-container');
  if (!gameUIContainer) {
    gameUIContainer = document.createElement('div');
    gameUIContainer.id = 'game-ui-container';
    document.body.appendChild(gameUIContainer);
  }
  
  // Mount the GameUI component
  const gameUIRoot = createRoot(gameUIContainer);
  gameUIRoot.render(<GameUI gc={window.gameClient} />);
  
  console.log('✅ React Game UI components mounted successfully');
}

// Start the React components setup
mountReactComponents();

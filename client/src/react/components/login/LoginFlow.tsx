import React, { useState, useEffect } from "react";
import LoginIsland from "../../LoginIsland";
import AssetDownload from "./AssetDownload";
import CharacterSelect from "./CharacterSelect";
import ChangelogModal from "../ChangelogModal";
import type GameClient from "../../../core/gameclient";
import './styles/LoginFlow.scss';

type LoginStep = "login" | "asset-download" | "character-select" | "game";

interface LoginFlowProps {
  onGameStart: () => void;
}

export default function LoginFlow({ onGameStart }: LoginFlowProps) {
  const [step, setStep] = useState<LoginStep>("login");
  const [gameClient, setGameClient] = useState<GameClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const authToken = localStorage.getItem("auth_token");
    if (authToken) {
      // User is authenticated, move to character select
      setStep("character-select");
      
      // Wait for game client to be available
      const waitForGameClient = () => {
        if (window.gameClient) {
          setGameClient(window.gameClient);
          
          // Trigger server handshake to get characters for already authenticated user
          console.log('🔄 Starting server handshake for authenticated user...');
          window.gameClient.networkManager.openGameSocket(authToken);
          
          // Move to asset download for already authenticated users
          setStep("asset-download");
        } else {
          setTimeout(waitForGameClient, 100);
        }
      };
      waitForGameClient();
    }
  }, []);

  const handleLoginSuccess = async () => {
    setLoading(true);
    try {
      // Wait for game client to be available
      const waitForGameClient = () => {
        return new Promise<GameClient>((resolve) => {
          const checkForGameClient = () => {
            if (window.gameClient) {
              resolve(window.gameClient);
            } else {
              setTimeout(checkForGameClient, 100);
            }
          };
          checkForGameClient();
        });
      };

      const gc = await waitForGameClient();
      setGameClient(gc);
      
      // Trigger server handshake to get characters
      const authToken = localStorage.getItem("auth_token");
      if (authToken && gc.networkManager) {
        console.log('🔄 Starting server handshake for character loading...');
        gc.networkManager.openGameSocket(authToken);
        
        // Move to asset download first
        setStep("asset-download");
      } else {
        console.error('❌ Missing auth token or network manager');
      }
    } catch (error) {
      console.error("Failed to initialize game client:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetDownloadComplete = () => {
    setStep("character-select");
  };

  const handleCharacterSelected = () => {
    setStep("game");
    onGameStart();
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setGameClient(null);
    setStep("login");
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="loading-spinner"></div>
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <>
      {step === "login" && (
        <LoginIsland 
          onLoggedIn={handleLoginSuccess} 
          onShowChangelog={() => setShowChangelog(true)}
        />
      )}
        
      {step === "asset-download" && gameClient && (
        <AssetDownload 
          gc={gameClient} 
          onDownloadComplete={handleAssetDownloadComplete}
        />
      )}
        
      {step === "character-select" && gameClient && (
          <div id="post-login-wrapper">
            <div id="post-login-topbar" className="topbar">
              <div className="user-info">
                <div className="user-details">
                  <div className="user-meta">
                    <span id="account-type">Normal Account</span>
                    <span id="diamond-count">💎 0</span>
                  </div>
                </div>
              </div>
              
              <div className="topbar-center">
                <button className="btn-border btn-gold" onClick={() => setStep("character-select")}>
                  Play
                </button>
                <button className="btn-border btn-gold" onClick={() => setShowChangelog(true)}>
                  📋 Changelog
                </button>
              </div>

              <div className="topbar-right">
                <button className="btn-border btn-white special" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
            
            <div id="post-login-body" className="post-login-body">
              <CharacterSelect 
                gc={gameClient} 
                onCharacterSelected={handleCharacterSelected}
              />
            </div>
          </div>
        )}
        
      <ChangelogModal 
        isVisible={showChangelog} 
        onClose={() => setShowChangelog(false)} 
      />
    </>
  );
}

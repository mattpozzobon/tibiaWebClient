import React, { useEffect, useState } from "react";
import LoginIsland from "../../LoginIsland";
import AssetDownload from "./AssetDownload";
import CharacterSelect from "./CharacterSelect";
import ChangelogModal from "../ChangelogModal";
import type GameClient from "../../../core/gameclient";
import './styles/LoginFlow.scss';

type LoginStep = "login" | "asset-download" | "character-select" | "game";

interface LoginFlowProps {
  gc: GameClient | null;          
  engineStatus?: string;
  onGameStart: () => void;        
  onCharacterSelected: () => void;
}

export default function LoginFlow({ gc, engineStatus, onGameStart, onCharacterSelected }: LoginFlowProps) {
  const [step, setStep] = useState<LoginStep>(() =>
    localStorage.getItem("auth_token") ? "asset-download" : "login"
  );
  const [showChangelog, setShowChangelog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!gc || !token) return;
    try {
      gc.networkManager.openGameSocket(token);
    } catch (e) {
      console.error("openGameSocket failed:", e);
    }
  }, [gc]);

  const handleLoginSuccess = () => {
    setLoading(true);
    onGameStart();    
    setStep("asset-download");
    setLoading(false);
  };

  const handleAssetDownloadComplete = () => setStep("character-select");

  const handleCharacterSelected = () => {
    setStep("game");
    onCharacterSelected(); 
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setStep("login");
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="loading-spinner"></div>
        <p>Initializing… {engineStatus && <small>({engineStatus})</small>}</p>
      </div>
    );
  }

  return (
    <>
      {step === "login" && (
        <LoginIsland onLoggedIn={handleLoginSuccess} onShowChangelog={() => setShowChangelog(true)}
        />
      )}

      {step === "asset-download" && (
        <AssetDownload gc={gc || undefined} onDownloadComplete={handleAssetDownloadComplete}
        />
      )}

      {step === "character-select" && (
        <div id="post-login-wrapper">
          <div id="post-login-topbar" className="topbar">
            <div className="topbar-center">
              <button className="btn-border btn-gold" onClick={() => setShowChangelog(true)}>📋 Changelog</button>
            </div>
            <div className="topbar-right">
              <button className="btn-border btn-white special" onClick={handleLogout}>Logout</button>
            </div>
          </div>

          <div id="post-login-body" className="post-login-body">
            <CharacterSelect gc={gc || null} onCharacterSelected={handleCharacterSelected}
            />
          </div>
        </div>
      )}

      <ChangelogModal isVisible={showChangelog} onClose={() => setShowChangelog(false)} />
    </>
  );
}

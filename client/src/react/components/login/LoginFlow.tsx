import React, { useEffect, useState } from "react";
import LoginIsland from "../../LoginIsland";
import AccountIsland from "./AccountIsland";
import AssetDownload from "./AssetDownload";
import CharacterSelect from "./CharacterSelect";
import ChangelogSidebar from "./ChangelogSidebar";
import ChangelogModal from "../ChangelogModal";
import BuildInfo from "./BuildInfo";
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

  const [loading, setLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

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
    <div id="login-page-container">
      {step === "login" && (
        <>
          <LoginIsland onLoggedIn={handleLoginSuccess} />
          <ChangelogSidebar/>
        </>
      )}

      {(step === "asset-download" || step === "character-select") && (
        <>
          <AccountIsland step={step} gc={gc} onLogout={handleLogout} onShowChangelog={() => setShowChangelog(true)} onDownloadComplete={handleAssetDownloadComplete} onCharacterSelected={handleCharacterSelected}/>
          <ChangelogModal isVisible={showChangelog} onClose={() => setShowChangelog(false)} />
        </>

      )}

      <BuildInfo />
    </div>
  );
}

import React from "react";
import AssetDownload from "./AssetDownload";
import CharacterSelect from "./CharacterSelect";
import type GameClient from "../../../core/gameclient";
import './styles/AccountIsland.scss';

type AccountStep = "asset-download" | "character-select";

interface AccountIslandProps {
  step: AccountStep;
  gc: GameClient | null;
  onLogout?: () => void;
  onShowChangelog?: () => void;
  onDownloadComplete?: () => void;
  onCharacterSelected?: () => void;
}

export default function AccountIsland({ 
  step, 
  gc, 
  onLogout, 
  onShowChangelog, 
  onDownloadComplete, 
  onCharacterSelected 
}: AccountIslandProps) {
  return (
    <>

      {/* Main Content Area */}
      <div className="account-content">
        {step === "asset-download" && (
          <AssetDownload gc={gc || undefined} onDownloadComplete={onDownloadComplete || (() => {})} />
        )}
        {step === "character-select" && (
          <CharacterSelect 
            gc={gc} 
            onCharacterSelected={onCharacterSelected || (() => {})} 
            onLogout={onLogout}
          />
        )}
      </div>

      {/* Action buttons in the header area */}
      {(onLogout || onShowChangelog) && (
        <div className="account-actions">
          {onShowChangelog && (
            <button 
              className="btn-border btn-gold" 
              onClick={onShowChangelog}
            >
              📋 Changelog
            </button>
          )}
          {onLogout && (
            <button 
              className="btn-border btn-white special" 
              onClick={onLogout}
            >
              Logout
            </button>
          )}
        </div>
      )}
    </>
  );
}

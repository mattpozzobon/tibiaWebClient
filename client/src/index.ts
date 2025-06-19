
import GameClient from "./core/gameclient";

declare global {
  interface Window {
    gameClient: GameClient;
  }
}

(window as any).gameClient = new GameClient();

function initLogin() {
  window.gameClient.interface.modalManager.open("floater-enter");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin);
} else {
  initLogin();
}
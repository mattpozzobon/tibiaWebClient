import { LoginModal } from "./components/login/login-modal";
import GameClient from "./core/gameclient";

declare global {
  interface Window {
    gameClient: GameClient;
  }
}

(window as any).gameClient = new GameClient();

function initLogin() {
  new LoginModal();

  window.gameClient.interface.modalManager.open("floater-enter");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin);
} else {
  initLogin();
}

import GameClient from "./core/gameclient";
import { ChangelogModal } from "./ui/modals/modal-changelog";

declare global {
  interface Window {
    gameClient: GameClient;
  }
}

(window as any).gameClient = new GameClient();

function initLogin() {
  new ChangelogModal();
  window.gameClient.interface.modalManager.open("floater-enter");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin);
} else {
  initLogin();
}
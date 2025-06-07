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

  const btn = document.getElementById("enter-game") as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogin);
} else {
  initLogin();
}
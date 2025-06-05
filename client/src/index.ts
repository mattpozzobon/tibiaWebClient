import GameClient from "./core/gameclient";

declare global {
  interface Window {
    gameClient: GameClient;
  }
}

/* make it global right away */
(window as any).gameClient = new GameClient();

/* optional – DOM-ready stuff that needs buttons, etc. */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('enter-game') as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
});
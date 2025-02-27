import GameClient from "./gameclient";

declare global {
  interface Window {
    gameClient: GameClient;
  }
}

window.onload = function windowOnLoad(): void {
  window.gameClient = new GameClient();
};

document.addEventListener("DOMContentLoaded", (): void => {
  const enterGame = document.getElementById("enter-game") as HTMLButtonElement | null;
  if (enterGame) {
    enterGame.disabled = true;
  }
});

export {};

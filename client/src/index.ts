import GameClient from "./gameclient";

const gameClient = new GameClient();

document.addEventListener("DOMContentLoaded", (): void => {
  const enterGame = document.getElementById("enter-game") as HTMLButtonElement | null;
  if (enterGame) {
    enterGame.disabled = true;
    console.log('aa');
  }
  console.log('nnn');
});

export default gameClient;

import Renderer from './renderer/renderer';
import GameClient from './core/gameclient';
import { ChangelogModal } from './ui/modals/modal-changelog';

declare global {
  interface Window { gameClient: GameClient }
}

async function bootstrapGame() {
  const renderer = await Renderer.create();
  window.gameClient = new GameClient(renderer);
  new ChangelogModal();
  window.gameClient.interface.modalManager.open("floater-enter");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapGame);
} else {
  bootstrapGame();
}

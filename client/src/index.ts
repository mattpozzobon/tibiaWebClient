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
  // React components will handle login UI - no need to open modal here
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapGame);
} else {
  bootstrapGame();
}

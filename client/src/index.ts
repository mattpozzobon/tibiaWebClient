import Renderer from './renderer/renderer';
import GameClient from './core/gameclient';
// ChangelogModal now handled by React components

declare global {
  interface Window { gameClient: GameClient }
}

async function bootstrapGame() {
  const renderer = await Renderer.create();
  window.gameClient = new GameClient(renderer);
  // ChangelogModal now handled by React components
  // React components will handle login UI - no need to open modal here
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapGame);
} else {
  bootstrapGame();
}

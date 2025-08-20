import Tile from '../game/tile';

export type TileLightStyle = { tint?: number; alpha?: number; blendMode?: string };

export default class TileLighting {
  enabled = true;
  dimTint = 0xA0A0A0;
  dimAlpha = 0.85;

  /** Return a style for this tile (or undefined for no change). */
  styleFor(tile: Tile): TileLightStyle | undefined {
    if (!this.enabled) return;

    const playerZ = window.gameClient.player!.getPosition().z;
    const z = tile.getPosition().z;

    // dim floors below the player; tweak to your z convention if needed
    if (z < playerZ) {
      return { tint: this.dimTint, alpha: this.dimAlpha, blendMode: "NORMAL" };
    }
    return undefined;
  }
}

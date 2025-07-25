import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";
import AnimationRenderer from "./animation-renderer";

export default class TileRenderer {
  public tileCache: Tile[][] = [];
  private animationRenderer: AnimationRenderer;

  constructor() {
    // No longer need sprite pool parameters since we use batching
    this.animationRenderer = new AnimationRenderer();
  }

  public refreshVisibleTiles(): void {
    this.tileCache = [];
    const player = window.gameClient.player!;
    const world = window.gameClient.world!;
    const maxFloor = player.getMaxFloor();
  
    for (let floor = 0; floor < maxFloor; floor++) {
      const floorTiles: Tile[] = [];
      for (const chunk of world.chunks) {
        for (const tile of chunk.getFloorTiles(floor)) {
          if (!player.canSee(tile)) continue;
          if (tile.id === 0 && tile.items.length === 0) continue;
          floorTiles.push(tile);
        }
      }
      this.tileCache.push(floorTiles);
    }
    
    this.tileCache.reduce((sum, floor) => sum + floor.length, 0);
  }

  /**
   * Collect sprites for batching instead of rendering immediately
   */
  public collectSprites(tile: Tile, screenPos: Position, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    tile.setElevation(0);
    const xCell = screenPos.x, yCell = screenPos.y;
    if (xCell < -1 || xCell > 27 || yCell < -1 || yCell > 14) return;

    const px = xCell * 32;
    const py = yCell * 32;

    let fg: FrameGroup;
    try {
      fg = tile.getFrameGroup(FrameGroup.NONE);
    } catch {
      return;
    }

    const f = tile.getFrame();
    const p = tile.getPattern();
    
    if (fg.width === 1 && fg.height === 1 && fg.layers === 1) {
      const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, 0, 0, 0);
      const tex = fg.getSprite(sid);
      if (tex) {
        const textureKey = tex.baseTexture.uid.toString();
        if (!spriteBatches.has(textureKey)) {
          spriteBatches.set(textureKey, []);
        }
        spriteBatches.get(textureKey)!.push({
          sprite: { texture: tex },
          x: px,
          y: py,
          width: 32,
          height: 32
        });
      }
      return;
    }

    for (let l = 0; l < fg.layers; l++) {
      for (let cx = 0; cx < fg.width; cx++) {
        for (let cy = 0; cy < fg.height; cy++) {
          const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, l, cx, cy);
          const tex = fg.getSprite(sid);
          if (tex) {
            const textureKey = tex.baseTexture.uid.toString();
            if (!spriteBatches.has(textureKey)) {
              spriteBatches.set(textureKey, []);
            }
            spriteBatches.get(textureKey)!.push({
              sprite: { texture: tex },
              x: px,
              y: py,
              width: 32,
              height: 32
            });
          }
        }
      }
    }
  }

  /**
   * Collect tile animation sprites
   */
  public collectAnimationSprites(
    tile: Tile, 
    screenPos: Position, 
    spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    this.animationRenderer.renderTileAnimations(tile, spriteBatches, getStaticScreenPosition);
  }
}

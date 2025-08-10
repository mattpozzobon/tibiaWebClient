import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";
import AnimationRenderer from "./animation-renderer";
import Interface from "../ui/interface";
import { BatchSprite } from "../types/types";

export default class TileRenderer {
  public tileCache: Tile[][] = [];
  private animationRenderer: AnimationRenderer;

  constructor() {
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
  }

  public collectSprites(tile: Tile, screenPos: Position, spriteBatches: Map<number, BatchSprite[]>): void {
    tile.setElevation(0);
    const xCell = screenPos.x, yCell = screenPos.y;
    if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) return;

    let fg: FrameGroup;
    try {
      fg = tile.getFrameGroup(FrameGroup.NONE);
    } catch {
      return;
    }

    const f = tile.getFrame();
    const p = tile.getPattern();

    // simple 1x1 fast path
    if (fg.width === 1 && fg.height === 1 && fg.layers === 1) {
      const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, 0, 0, 0);
      const tex = fg.getSprite(sid);
      if (tex) {
        const key = tex.source.uid as number;
        if (!spriteBatches.has(key)) spriteBatches.set(key, []);
        spriteBatches.get(key)!.push({
          sprite: { texture: tex },
          x: xCell * Interface.TILE_SIZE,
          y: yCell * Interface.TILE_SIZE,
          width: Interface.TILE_SIZE,
          height: Interface.TILE_SIZE
        });
      }
      return;
    }

    // multi-tile: each piece must shift by (cx, cy)
    for (let l = 0; l < fg.layers; l++) {
      for (let cx = 0; cx < fg.width; cx++) {
        for (let cy = 0; cy < fg.height; cy++) {
          const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, l, cx, cy);
          const tex = fg.getSprite(sid);
          if (!tex) continue;

          const key = tex.source.uid as number;
          if (!spriteBatches.has(key)) spriteBatches.set(key, []);

          spriteBatches.get(key)!.push({
            sprite: { texture: tex },
            x: (xCell - cx) * Interface.TILE_SIZE,
            y: (yCell - cy) * Interface.TILE_SIZE,
            width: Interface.TILE_SIZE,
            height: Interface.TILE_SIZE
          });
        }
      }
    }
  }

  public collectAnimationSprites(
    tile: Tile,
    _screenPos: Position,
    spriteBatches: Map<number, BatchSprite[]>,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    this.animationRenderer.renderTileAnimations(tile, spriteBatches, getStaticScreenPosition);
  }
}

import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";
import AnimationRenderer from "./animation-renderer";
import Interface from "../ui/interface";
import SpriteBatcher from "./sprite-batcher";
import TileLighting from "./tile-lighting";


export default class TileRenderer {
  public tileCache: Tile[][] = [];
  private animationRenderer: AnimationRenderer;
  private lighting: TileLighting;

  constructor(animationRenderer: AnimationRenderer, lighting = new TileLighting()) {
    this.animationRenderer = animationRenderer;
    this.lighting = lighting;
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

  public collectSprites(tile: Tile, screenPos: Position, batcher: SpriteBatcher): void {
    tile.setElevation(0);
    const xCell = screenPos.x, yCell = screenPos.y;
    if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) return;

    const px = xCell * Interface.TILE_SIZE;
    const py = yCell * Interface.TILE_SIZE;

    let fg: FrameGroup;
    try { fg = tile.getFrameGroup(FrameGroup.NONE); } catch { return; }

    const f = tile.getFrame();
    const p = tile.getPattern();

    // ask the lighting system for a per-tile style
    const style = this.lighting?.styleFor(tile);

    if (fg.width === 1 && fg.height === 1 && fg.layers === 1) {
      const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, 0, 0, 0);
      const tex = fg.getSprite(sid);
      if (tex) batcher.push(tex, px, py, Interface.TILE_SIZE, Interface.TILE_SIZE, false, style);
      return;
    }

    for (let l = 0; l < fg.layers; l++) {
      for (let cx = 0; cx < fg.width; cx++) {
        for (let cy = 0; cy < fg.height; cy++) {
          const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, l, cx, cy);
          const tex = fg.getSprite(sid);
          if (tex) {
            batcher.push(tex, px, py, Interface.TILE_SIZE, Interface.TILE_SIZE, false, style);
          }
        }
      }
    }
  }

  public collectAnimationSprites(
    tile: Tile,
    _screenPos: Position,
    batcher: SpriteBatcher,
    getStaticScreenPosition?: (pos: Position) => Position
  ): void {
    this.animationRenderer.renderTileAnimations(tile, batcher, getStaticScreenPosition);
  }
}

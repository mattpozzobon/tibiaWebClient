import { Application, Container, Sprite, Texture } from "pixi.js";
import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";

export default class TileRenderer {
  private tileContainer: Container;
  private tilePool: Sprite[];
  private readonly poolSize = 27 * 13 * 2;
  private app: Application;
  private getStaticScreenPosition: (pos: Position) => Position;

  private visibleTiles: Tile[] = [];
  public numberOfTiles = 0;

  constructor(app: Application, getStaticScreenPosition: (pos: Position) => Position) {
    this.app = app;
    this.getStaticScreenPosition = getStaticScreenPosition;

    this.tileContainer = new Container();
    this.app.stage.addChild(this.tileContainer);

    this.tilePool = new Array(this.poolSize);
    for (let i = 0; i < this.poolSize; i++) {
      const s = new Sprite(Texture.EMPTY);
      s.width = 32;
      s.height = 32;
      s.visible = false;
      this.tileContainer.addChild(s);
      this.tilePool[i] = s;
    }
  }

  /**
   * Build (or rebuild) the list of just‑visible tiles.
   * Call this once whenever the player moves, teleports, logs in, etc.
   */
  public refreshVisibleTiles(): void {
    const player = window.gameClient.player!;
    const world  = window.gameClient.world!;
    const maxFloor = player.getMaxFloor();

    this.visibleTiles = [];
    this.numberOfTiles = 0;

    // floor → chunk → tile, exactly once per move
    for (let floor = 0; floor < maxFloor; floor++) {
      for (const chunk of world.chunks) {
        for (const tile of chunk.getFloorTiles(floor)) {
          if (!player.canSee(tile)) continue;
          if (tile.id === 0 && tile.items.length === 0) continue;
          this.visibleTiles.push(tile);
          this.numberOfTiles++;
        }
      }
    }
  }

  /**
   * HOT PATH: called every frame.
   * Just walks your prebuilt list of `visibleTiles` and blits them.
   */
  public render(): void {
    // nothing to do if we haven't cached yet
    if (this.visibleTiles.length === 0) return;

    const pool     = this.tilePool;
    const poolSize = pool.length;
    let idx        = 0;

    // blit only those tiles
    for (const tile of this.visibleTiles) {
      if (idx >= poolSize) break;
      idx = this.renderTile(tile, idx, poolSize);
    }

    // hide leftovers
    for (let i = idx; i < poolSize; i++) {
      pool[i].visible = false;
    }
  }

  /**
   * Renders a single tile (may take multiple sprites).
   * Returns the next free poolIndex.
   */
  private renderTile(
    tile: Tile,
    poolIndex: number,
    poolSize: number
  ): number {
    tile.setElevation(0);

    const pos   = this.getStaticScreenPosition(tile.getPosition());
    const xCell = pos.x, yCell = pos.y;

    // quick cull in tile‑space
    if (xCell < -1 || xCell > 27 || yCell < -1 || yCell > 14) {
      return poolIndex;
    }

    const px = xCell * 32;
    const py = yCell * 32;

    // may throw if dataObjects not yet loaded
    let fg: FrameGroup;
    try {
      fg = tile.getFrameGroup(FrameGroup.NONE);
    } catch {
      return poolIndex;
    }

    const f = tile.getFrame();
    const p = tile.getPattern();

    // very common 1×1×1
    if (fg.width === 1 && fg.height === 1 && fg.layers === 1) {
      if (poolIndex < poolSize) {
        const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, 0, 0, 0);
        const tex = fg.getSprite(sid);
        if (tex) {
          const spr = this.tilePool[poolIndex++];
          spr.texture = tex;
          spr.x = px; spr.y = py; spr.visible = true;
        }
      }
      return poolIndex;
    }

    // fallback multi‑sprite
    for (let l = 0; l < fg.layers; l++) {
      for (let cx = 0; cx < fg.width; cx++) {
        for (let cy = 0; cy < fg.height; cy++) {
          if (poolIndex >= poolSize) return poolIndex;
          const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, l, cx, cy);
          const tex = fg.getSprite(sid);
          const spr = this.tilePool[poolIndex++];
          if (tex) {
            spr.texture = tex;
            spr.x = px; spr.y = py; spr.visible = true;
          } else {
            spr.visible = false;
          }
        }
      }
    }

    return poolIndex;
  }
}

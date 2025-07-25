import { Application, Container, Sprite, Texture } from "pixi.js";
import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";

export default class TileRenderer {
  private spritePool: Sprite[];
  private getPoolIndex: () => number;
  private setPoolIndex: (v: number) => void;
  private poolSize: number;
  public tileCache: Tile[][] = [];

  constructor(
    spritePool: Sprite[],
    getPoolIndex: () => number,
    setPoolIndex: (v: number) => void,
    poolSize: number
  ) {
    this.spritePool = spritePool;
    this.getPoolIndex = getPoolIndex;
    this.setPoolIndex = setPoolIndex;
    this.poolSize = poolSize
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

  public render(tile: Tile, screenPos: Position): void {
    let poolIndex = this.getPoolIndex();

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
      if (poolIndex < this.poolSize) {
        const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, 0, 0, 0);
        const tex = fg.getSprite(sid);
        if (tex) {
          const spr = this.spritePool[poolIndex++];
          spr.texture = tex;
          spr.x = px; spr.y = py; spr.visible = true;
        }
        window.gameClient.renderer.drawCalls++;
      }
      this.setPoolIndex(poolIndex);
      return;
    }

    for (let l = 0; l < fg.layers; l++) {
      for (let cx = 0; cx < fg.width; cx++) {
        for (let cy = 0; cy < fg.height; cy++) {
          if (poolIndex >= this.poolSize) return;
          const sid = fg.getSpriteIndex(f, p.x, p.y, p.z, l, cx, cy);
          const tex = fg.getSprite(sid);
          const spr = this.spritePool[poolIndex++];
          if (tex) {
            spr.texture = tex;
            spr.x = px; spr.y = py; spr.visible = true;
          } else {
            spr.visible = false;
          }
          window.gameClient.renderer.drawCalls++;
        }
      }
    }
    this.setPoolIndex(poolIndex);
  }
  
}

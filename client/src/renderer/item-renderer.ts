import { Application, Container, Sprite, Texture } from "pixi.js";
import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";

export default class ItemRenderer {
  private spritePool: Sprite[];
  private getPoolIndex: () => number;
  private setPoolIndex: (v: number) => void;
  private poolSize: number;

  constructor(
    spritePool: Sprite[],
    getPoolIndex: () => number,
    setPoolIndex: (v: number) => void,
    poolSize: number
  ) {
    this.spritePool = spritePool;
    this.getPoolIndex = getPoolIndex;
    this.setPoolIndex = setPoolIndex;
    this.poolSize = poolSize;
  }

  public renderItemsForTile(tile: Tile, screenPos: Position): void {
    let poolIndex = this.getPoolIndex();

    const items: Item[] = tile.items;
    let elevation = tile.__renderElevation ?? 0;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;
      poolIndex = this.drawSprite(item, screenPos, elevation, 32, poolIndex, this.poolSize);
      if (item.isElevation && item.isElevation()) {
        elevation += item.getDataObject().properties.elevation;
      }
    }

    this.setPoolIndex(poolIndex);
  }

  public renderOnTopItemsForTile(tile: Tile, screenPos: Position): void {
    let poolIndex = this.getPoolIndex();

    const items: Item[] = tile.items;
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;
      poolIndex = this.drawSprite(item, screenPos, 0, 32, poolIndex, this.poolSize);
    }

    this.setPoolIndex(poolIndex);
  }

  public drawSprite(
    thing: any,
    position: Position,
    elevation: number,
    size: number,
    poolIndex: number,
    poolSize: number
  ): number {
    const frameGroup = thing.getFrameGroup(FrameGroup.NONE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();

    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          if (poolIndex >= poolSize) return poolIndex;
          let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          const texture = frameGroup.getSprite(index);
          poolIndex = this.__drawSprite(texture, position, elevation, x, y, size, poolIndex, poolSize);
        }
      }
    }
    return poolIndex;
  }

  private __drawSprite(
    texture: Texture | null,
    position: Position,
    elevation: number,
    x: number,
    y: number,
    size: number,
    poolIndex: number,
    poolSize: number
  ): number {
    if (!texture) return poolIndex;
    if (poolIndex >= poolSize) return poolIndex;
    const spr = this.spritePool[poolIndex++];
    spr.texture = texture;
    spr.x = Math.round(size * (position.x - x - elevation));
    spr.y = Math.round(size * (position.y - y - elevation));
    spr.width = size;
    spr.height = size;
    spr.visible = true;
    window.gameClient.renderer.drawCalls++;
    return poolIndex;
  }
}

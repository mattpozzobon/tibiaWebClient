// ItemRenderer.ts
import { Application, Container, Sprite, Texture } from "pixi.js";
import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";

export default class ItemRenderer {
  private itemContainer: Container;
  private itemPool: Sprite[];
  private readonly poolSize = 28 * 14 * 2; 

  private poolIndex: number = 0;

  constructor(app: Application) {
    this.itemContainer = new Container();
    app.stage.addChild(this.itemContainer);

    this.itemPool = new Array(this.poolSize);
    for (let i = 0; i < this.poolSize; i++) {
      const s = new Sprite(Texture.EMPTY);
      s.width = 32;
      s.height = 32;
      s.visible = false;
      this.itemContainer.addChild(s);
      this.itemPool[i] = s;
    }
  }

  public beginFrame() { this.poolIndex = 0; }
  public endFrame() {
    for (let i = this.poolIndex; i < this.poolSize; i++) {
      this.itemPool[i].visible = false;
    }
  }

  public render(tiles: Tile[], getScreenPos: (pos: Position) => Position): void {
  this.beginFrame();
  for (const tile of tiles) {
    const screenPos = getScreenPos(tile.getPosition());
    this.renderItemsForTile(tile, screenPos);
    this.renderOnTopItemsForTile(tile, screenPos);
  }
  this.endFrame();
}


  public renderItemsForTile(tile: Tile, screenPos: Position): void {
    const items: Item[] = tile.items;
    let elevation = tile.__renderElevation ?? 0;

    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      // Multi-frame/layer drawing for items (mirrors your tile drawing logic)
      this.drawSprite(item, screenPos, elevation, 32);

      // Elevation stacking
      if (item.isElevation && item.isElevation()) {
        elevation += item.getDataObject().properties.elevation;
      }
    }
  }

  public renderOnTopItemsForTile(tile: Tile, screenPos: Position): void {
    const items: Item[] = tile.items;
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;

      this.drawSprite(item, screenPos, 0, 32);
    }
  }

  /**
   * Multi-frame/layer draw, like in your code (canvas logic, but for Pixi Sprites)
   */
  public drawSprite(thing: any, position: Position, elevation: number, size: number): void {
    const frameGroup = thing.getFrameGroup(FrameGroup.NONE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();

    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          const texture = frameGroup.getSprite(index);
          this.__drawSprite(texture, position, elevation, x, y, size);
        }
      }
    }
  }

  /**
   * Actually renders a single sub-sprite using the pooled Sprite (with offset for frame/layer)
   */
  private __drawSprite(
    texture: Texture | null,
    position: Position,
    elevation: number,
    x: number,
    y: number,
    size: number
  ): void {
    if (!texture) return;
    if (this.poolIndex >= this.poolSize) return;

    const spr = this.itemPool[this.poolIndex++];
    spr.texture = texture;
    // Calculate screen position (as in your math)
    spr.x = Math.round(size * (position.x - x - elevation));
    spr.y = Math.round(size * (position.y - y - elevation));
    spr.width = size;
    spr.height = size;
    spr.visible = true;
  }
}

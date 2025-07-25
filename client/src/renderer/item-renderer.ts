import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";

export default class ItemRenderer {
  constructor() {
    // No longer need sprite pool parameters since we use batching
  }

  /**
   * Collect sprites for batching instead of rendering immediately
   */
  public collectSpritesForTile(tile: Tile, screenPos: Position, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    const items: Item[] = tile.items;
    let elevation = tile.__renderElevation ?? 0;
    
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;
      this.collectSpriteForItem(item, screenPos, elevation, 32, spriteBatches);
      if (item.isElevation && item.isElevation()) {
        elevation += item.getDataObject().properties.elevation;
      }
    }
  }
  
  public collectOnTopSpritesForTile(tile: Tile, screenPos: Position, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    const items: Item[] = tile.items;
    
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;
      this.collectSpriteForItem(item, screenPos, 0, 32, spriteBatches);
    }
  }
  
  private collectSpriteForItem(
    thing: any,
    position: Position,
    elevation: number,
    size: number,
    spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>
  ): void {
    const frameGroup = thing.getFrameGroup(FrameGroup.NONE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();

    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          const texture = frameGroup.getSprite(index);
          if (texture) {
            const textureKey = texture.baseTexture.uid.toString();
            if (!spriteBatches.has(textureKey)) {
              spriteBatches.set(textureKey, []);
            }
            spriteBatches.get(textureKey)!.push({
              sprite: { texture: texture },
              x: Math.round(size * (position.x - x - elevation)),
              y: Math.round(size * (position.y - y - elevation)),
              width: size,
              height: size
            });
          }
        }
      }
    }
  }
}

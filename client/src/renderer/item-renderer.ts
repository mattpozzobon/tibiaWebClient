import Tile from "../game/tile";
import Item from "../game/item";
import Position from "../game/position";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import Interface from "../ui/interface";

export default class ItemRenderer {
  private lastHoveredTile: any = null;
  
  constructor() {
    // No longer need sprite pool parameters since we use batching
  }

  /**
   * Collect sprites for batching instead of rendering immediately
   */
  public collectSpritesForTile(tile: Tile, screenPos: Position, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    const items: Item[] = tile.items;
    const currentHoverTile = window.gameClient.mouse.getCurrentTileHover();
    
    // Clear outline if we're no longer hovering over the same tile
    if (this.lastHoveredTile && this.lastHoveredTile !== currentHoverTile) {
      window.gameClient.renderer.outlineCanvas.clearOutline();
    }
    
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;
      this.collectSpriteForItem(item, screenPos, tile.__renderElevation, 32, spriteBatches);
      
      // Check if this is a pickupable item and we're hovering over it
      if (item.isPickupable() && i === items.length - 1 && tile === currentHoverTile) {
        this.createItemOutline(item, screenPos);
        this.lastHoveredTile = currentHoverTile;
      }
      
      if (item.isElevation && item.isElevation()) {
        tile.addElevation(item.getDataObject().properties.elevation);
      }
    }
  }
  
  public collectOnTopSpritesForTile(tile: Tile, screenPos: Position, spriteBatches: Map<string, Array<{sprite: any, x: number, y: number, width: number, height: number}>>): void {
    const items: Item[] = tile.items;
    
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (!item.hasFlag(PropBitFlag.DatFlagOnTop)) continue;
      this.collectSpriteForItem(item, screenPos, 0, 32, spriteBatches);
      
      // // Check if this is a pickupable item and we're hovering over it
      // if (item.isPickupable() && i === items.length - 1 && tile === window.gameClient.mouse.getCurrentTileHover()) {
      //   this.createItemOutline(item, screenPos);
      // }
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
            
            const xCell = position.x - x - elevation;
            const yCell = position.y - y - elevation;
            
            // Boundary check - same as tile-renderer
            if (xCell < -1 || xCell > Interface.TILE_WIDTH || yCell < -1 || yCell > Interface.TILE_HEIGHT) continue;
            
            spriteBatches.get(textureKey)!.push({
              sprite: { texture: texture },
              x: Math.round(size * xCell),
              y: Math.round(size * yCell),
              width: size,
              height: size
            });
          }
        }
      }
    }
  }

  /**
   * Creates an outline for pickupable items when hovering over them
   */
  private createItemOutline(item: Item, screenPos: Position): void {
    const frameGroup = item.getFrameGroup(FrameGroup.NONE);
    const frame = item.getFrame();
    const pattern = item.getPattern();
  
    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          // Use sprite ID, not array index
          const spriteId = frameGroup.getSpriteId(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          if (spriteId) {
            // Convert tile-based screenPos to pixel coordinates (center of tile), accounting for scaling and centering offsets
            const renderer = window.gameClient.renderer;
            const scale = renderer.scalingContainer.scale.x; // uniform scaling
            const tileSize = Interface.TILE_SIZE;
            const px = (screenPos.x * tileSize) * scale + renderer.scalingContainer.x + (tileSize / 2) * scale;
            const py = (screenPos.y * tileSize) * scale + renderer.scalingContainer.y + (tileSize / 2) * scale;

            renderer.outlineCanvas.createOutline(spriteId, { x: px, y: py });
            return;
          }
        }
      }
    }
  }
}
  

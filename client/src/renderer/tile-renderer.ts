import * as PIXI from "pixi.js";
import { Application, Container, Sprite } from "pixi.js";
import Tile from "../game/tile";
import Position from "../game/position";
import FrameGroup from "../utils/frame-group";

export default class TileRenderer {
  private tileContainer: Container;
  private tileSpritePool: Sprite[] = [];
  private tilePoolSize = 27 * 13 * 3; // Increased pool size for better performance
  private app: Application;
  private getStaticScreenPosition: (position: Position) => Position;

  constructor(app: Application, getStaticScreenPosition: (position: Position) => Position) {
    this.app = app;
    this.getStaticScreenPosition = getStaticScreenPosition;
    this.tileContainer = new Container();
    this.app.stage.addChild(this.tileContainer);
    
    // Initialize sprite pool
    this.tileSpritePool = [];
    for (let i = 0; i < this.tilePoolSize; i++) {
      const sprite = new Sprite();
      sprite.visible = false;
      this.tileContainer.addChild(sprite);
      this.tileSpritePool.push(sprite);
    }
    
    console.log("TileRenderer initialized with", this.tilePoolSize, "sprites");
  }

  public renderTiles(tileCache: Tile[][]): void {
    let poolIndex = 0;
    let totalTiles = 0;
    
    tileCache.forEach((tiles, floorIndex) => {
      totalTiles += tiles.length;
      for (const tile of tiles) {
        poolIndex = this.renderTile(tile, poolIndex);
        if (poolIndex >= this.tileSpritePool.length) {
          console.warn("Tile sprite pool exhausted!");
          break;
        }
      }
    });
    
    for (let i = poolIndex; i < this.tileSpritePool.length; i++) {
      this.tileSpritePool[i].visible = false;
    }
    
  }

  private renderTile(tile: Tile, poolIndex: number): number {
    if (tile.id === 0) return poolIndex;
    
    tile.setElevation(0);
    const tilePosition = tile.getPosition();
    const position = this.getStaticScreenPosition(tilePosition);
    if (position.x > 26 || position.y > 14 || position.x < -1 || position.y < -1) return poolIndex;


    const frameGroup = tile.getFrameGroup(FrameGroup.NONE);
    const frame = tile.getFrame();
    const pattern = tile.getPattern();

    if (frameGroup.width === 1 && frameGroup.height === 1 && frameGroup.layers === 1){
        const spriteId = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, 0, 0);
        const texture = frameGroup.getSprite(spriteId);
        if (texture) {
            const sprite = this.tileSpritePool[poolIndex++];
            sprite.texture = texture;
            sprite.x = position.x * 32;
            sprite.y = position.y * 32;
            sprite.width = 32;
            sprite.height = 32;
            sprite.visible = true;
        }
    } else {

        for (let x = 0; x < frameGroup.width; x++) {
            for (let y = 0; y < frameGroup.height; y++) {
                for (let l = 0; l < frameGroup.layers; l++) {
                if (poolIndex >= this.tileSpritePool.length) return poolIndex;
                
                let spriteId = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
                const texture = frameGroup.getSprite(spriteId);
                const sprite = this.tileSpritePool[poolIndex++];

                if (!texture) {
                    sprite.visible = false;
                    continue;
                }
                
                sprite.texture = texture;
                sprite.x = position.x * 32;
                sprite.y = position.y * 32;
                sprite.width = 32;
                sprite.height = 32;
                sprite.visible = true;
                }
            }
        }
    }
    
    return poolIndex;
  }

  public clear(): void {
    this.tileContainer.removeChildren();
    // Re-add sprites to container
    this.tileSpritePool.forEach(sprite => {
      this.tileContainer.addChild(sprite);
    });
  }

  public getTileContainer(): Container {
    return this.tileContainer;
  }

  public getPoolStats(): { total: number; used: number; available: number } {
    const used = this.tileSpritePool.filter(sprite => sprite.visible).length;
    return {
      total: this.tilePoolSize,
      used,
      available: this.tilePoolSize - used
    };
  }
} 
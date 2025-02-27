import GameClient from "./gameclient";
import Position from "./position";
import Tile from "./tile";


export default class Chunk {
  
  public id: any;
  public position: Position;
  public tiles: Tile[];

  // These are the static dimensions of the chunk.
  public static WIDTH: number;
  public static HEIGHT: number;
  public static DEPTH: number;

  constructor(id: any, position: Position, tiles: any[]) {
    
    this.id = id;
    this.position = position;
    // Initialize tiles by converting incoming definitions to Tile instances.
    this.tiles = this.__createTiles(tiles);
  }

  public besides(chunk: Chunk): boolean {
    // Returns true if this chunk is besides another chunk.
    return this.position.besides(chunk.position);
  }

  public getNumberTiles(): number {
    // Returns the total number of tiles in a chunk.
    return Chunk.WIDTH * Chunk.HEIGHT * Chunk.DEPTH;
  }

  public static getNumberTilesLayer(): number {
    return this.WIDTH * this.HEIGHT;
  }

  public getFloorTiles(floor: number): Tile[] {
    // Returns the slice of tiles for a particular floor.
    const index = floor % Chunk.DEPTH;
    const min = Chunk.WIDTH * Chunk.HEIGHT * index;
    const max = Chunk.WIDTH * Chunk.HEIGHT * (index + 1);
    return this.tiles.slice(min, max);
  }

  public getTileFromWorldPosition(position: Position): Tile | null {
    // Returns a tile from a true world position (after projecting it).
    return this.__getTileFromWorldPosition(position.projected());
  }

  public getFirstTileFromTop(position: Position): Tile | null {
    // Returns the first tile starting from the top for a given (x, y) screen position.
    const maximum = Math.max(0, window.gameClient.player!.getMaxFloor() - 1);
    const minimum = 0;

    // Check each floor from the top downward.
    for (let z = maximum; z >= minimum; z--) {
      const tile = this.__getTileFromWorldPosition(new Position(position.x, position.y, z));
      if (tile && (tile.id !== 0 || tile.items.length > 0)) {
        return tile;
      }
    }
    return null;
  }

  public getFirstFloorFromBottomProjected(position: Position): number {
    // Returns the first visible floor from the bottom, using a projected position.
    const minimum = (position.z % Chunk.DEPTH) + 1;
    const maximum = Math.max(minimum, Chunk.DEPTH);

    for (let z = 1; z <= maximum - minimum; z++) {
      const tilePosition = position;
      const tile = window.gameClient.world.getTileFromWorldPosition(
        new Position(tilePosition.x + z, tilePosition.y + z, tilePosition.z + z)
      );
      if (tile === null) {
        continue;
      }
      if (tile.id !== 0 && !tile.isTranslucent()) {
        return (tilePosition.z + z) % 8;
      }
    }
    return Chunk.DEPTH;
  }

  public getFirstFloorFromBottom(position: Position): number {
    // Returns the first visible floor from the bottom used for determining the maximum render layer.
    const positions: Position[] = [
      position,
      position.north(),
      position.west()
    ];
    const minimum = (position.z % Chunk.DEPTH) + 1;
    const maximum = Math.max(minimum, Chunk.DEPTH);

    for (let z = 1; z <= maximum - minimum; z++) {
      for (let i = 0; i < positions.length; i++) {
        const tilePosition = positions[i];
        const tile = window.gameClient.world.getTileFromWorldPosition(
          new Position(tilePosition.x + z, tilePosition.y + z, tilePosition.z + z)
        );
        if (tile === null) {
          continue;
        }
        if ((tile.id !== 0 && !tile.isTranslucent()) || tile.items.length > 0) {
          return (tilePosition.z + z) % 8;
        }
      }
    }
    return Chunk.DEPTH;
  }

  // Private helper methods

  private __createTiles(tiles: any[]): Tile[] {
    // Updates the chunk with the incoming definition of server tiles.
    const worldPosition = this.__getWorldPosition();
    return tiles.map((tile, i) => {
      // Get the relative tile position within the chunk.
      const relativeTilePosition = this.__getPositionFromIndex(i);
      // Calculate the true world position by adding the chunk's world position.
      const tileWorldPosition = worldPosition.add(relativeTilePosition.unprojected());
      // Create and return a new Tile.
      return new Tile(tile, tileWorldPosition);
    });
  }

  private __getTileFromIndex(index: number): Tile | null {
    // Returns the tile from a given index (if valid).
    if (index < 0 || index >= this.tiles.length) {
      return null;
    }
    return this.tiles[index];
  }

  private __getTileFromWorldPosition(worldPosition: Position): Tile | null {
    // Returns the tile at a given world position.
    if (!this.tiles) {
      return null;
    }
    return this.__getTileFromIndex(this.__getTileIndex(worldPosition));
  }

  private __getWorldPosition(): Position {
    // Returns the world position for the corner of the chunk.
    return new Position(
      Chunk.WIDTH * this.position.x,
      Chunk.HEIGHT * this.position.y,
      Chunk.DEPTH * this.position.z
    );
  }

  private __getPositionFromIndex(index: number): Position {
    // Returns the relative position of a tile within the chunk from its index.
    if (index < 0 || index >= Chunk.WIDTH * Chunk.HEIGHT * Chunk.DEPTH) {
      throw new Error("Could not map chunk index to world position.");
    }
    const x = index % Chunk.WIDTH;
    const y = Math.floor((index / Chunk.WIDTH) % Chunk.HEIGHT);
    const z = Math.floor(index / (Chunk.WIDTH * Chunk.HEIGHT));
    return new Position(x, y, z);
  }

  private __getTileIndex(worldPosition: Position): number {
    // Returns the index of the tile in the chunk for a given world position.
    const a = (worldPosition.x % Chunk.WIDTH);
    const b = (worldPosition.y % Chunk.HEIGHT) * Chunk.WIDTH;
    const c = (worldPosition.z % Chunk.DEPTH) * Chunk.WIDTH * Chunk.HEIGHT;
    return a + b + c;
  }
}

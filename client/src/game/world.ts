import Chunk from "../core/chunk";
import Clock from "../core/clock";
import Pathfinder from "../core/pathfinder";
import { TargetPacket } from "../core/protocol";
import Creature from "./creature";
import Player from "./player/player";
import Position from "./position";
import Tile from "./tile";
import { reactNotificationManager } from "../react/services/ReactNotificationManager";


export default class World {
  public width: number;
  public height: number;
  public depth: number;
  public nSectorsWidth: number;
  public nSectorsHeight: number;
  public nSectorsDepth: number;
  public activeCreatures: { [id: string]: any };
  public chunks: Chunk[];
  public pathfinder: any;
  public clock: any;

  constructor(width: number, height: number, depth: number) {
    
    this.width = width;
    this.height = height;
    this.depth = depth;

    // Determine the number of sectors on the map
    this.nSectorsWidth = this.width / Chunk.WIDTH;
    this.nSectorsHeight = this.height / Chunk.HEIGHT;
    this.nSectorsDepth = this.depth / Chunk.DEPTH;

    this.activeCreatures = {};
    this.chunks = [];
    this.pathfinder = new Pathfinder();
    this.clock = new Clock();
  }

  public handleSelfTeleport(): void {
    window.gameClient.player!.renderer.setTeleported(true);
    window.gameClient.player!.__serverWalkConfirmation = true;
    this.checkEntityReferences();
    this.checkChunks();
    window.gameClient.renderer.refreshVisibleTiles()
    //window.gameClient.renderer.minimap.setCenter();
    
    // Dispatch teleportation event for minimap and other systems
    const player = window.gameClient.player!;
    window.dispatchEvent(new CustomEvent('creatureMove', {
      detail: { 
        id: player.id, 
        position: player.getPosition(), 
        speed: 0, // Teleportation has no speed
        creature: player 
      }
    }));
    
    // if (window.gameClient.player!.renderer.getMovementEvent() === null) {
    //   window.gameClient.player!.renderer.setMovementEvent(window.gameClient.eventQueue.addEvent(
    //     window.gameClient.player!.unlockMovement.bind(window.gameClient.player),
    //     10
    //   ));
    // }
  }

  public handleTransformTile(packet: { position: Position; id: number }): void {
    const tile = this.getTileFromWorldPosition(packet.position);
    if (tile === null) return;
    tile.id = packet.id;
  }

  public addCreature(creature: any): void {
    const tile = this.getTileFromWorldPosition(creature.getPosition());
    if (tile === null) return;
    tile.addCreature(creature);
  }

  public checkEntityReferences(): void {
    Object.values(this.activeCreatures).forEach((activeCreature: any) => {
      if (window.gameClient.isSelf(activeCreature)) return;
      if (!window.gameClient.player!.getChunk().besides(activeCreature.getChunk())) {
        window.gameClient.networkManager.packetHandler.handleEntityRemove(activeCreature.id);
      }
    });
  }

  public handleCreatureMove(id: number | string, position: Position, speed: number): boolean {
    window.gameClient.player!.__serverWalkConfirmation = false;
    return this.__handleCreatureMove(id, position, speed);
  }

  public __handleCreatureMove(id: number | string, position: Position, speed: number): boolean {
    const creature = this.getCreature(id);
    if (creature === null) return false;
    if (position.equals(creature.getPosition())) return false;

    const fromTile = this.getTileFromWorldPosition(creature.getPosition());
    if (fromTile !== null) {
      fromTile.removeCreature(creature);
    }
    const tile = this.getTileFromWorldPosition(position);
    if (tile === null) return false;
    tile.addCreature(creature);

    creature.moveTo(position, speed);

    if (creature === window.gameClient.player) {
      //window.gameClient.player!.setAmbientSound();
    }

    // Dispatch event for minimap and other systems that need to know about creature movement
    window.dispatchEvent(new CustomEvent('creatureMove', {
      detail: { id, position, speed, creature }
    }));

    return true;
  }

  public createCreature(id: number | string, creature: any): any {
    this.activeCreatures[id] = creature;
    this.addCreature(creature);
    
    // Window system now handled by React components
    
    // Optional: Could dispatch a custom event for React components to listen to
    // window.dispatchEvent(new CustomEvent('creatureAdded', { detail: { id, creature } }));
    return creature;
  }

  public getCreature(id: number | string): Creature | Player | null {
    if (!this.activeCreatures.hasOwnProperty(id)) return null;
    return this.activeCreatures[id];
  }

  public checkChunks(): void {
    this.chunks = this.chunks.filter((chunk: any) => {
      return window.gameClient.player!.getChunk().besides(chunk);
    });
  }

  public referenceTileNeighbours(): void {
    this.chunks.forEach((chunk: any) => {
      chunk.tiles.forEach((tile: any) => {
        tile.neighbours = [];
        const tiles = [
          tile.getPosition().west(),
          tile.getPosition().north(),
          tile.getPosition().east(),
          tile.getPosition().south(),
          tile.getPosition().northwest(),
          tile.getPosition().southwest(),
          tile.getPosition().northeast(),
          tile.getPosition().southeast()
        ];
        tiles
          .map(this.getTileFromWorldPosition, this)
          .forEach((x: any) => {
            if (x === null || x.id === 0) return;
            tile.neighbours.push(x);
          });
      });
    });
  }

  public isValidWorldPosition(worldPosition: Position): boolean {
    return worldPosition.x >= 0 &&
           worldPosition.y >= 0 &&
           worldPosition.z >= 0 &&
           worldPosition.x < this.width &&
           worldPosition.y < this.height &&
           worldPosition.z < this.depth;
  }

  public findChunk(position: Position): Chunk | null {
    const index = this.getChunkIndex(this.getChunkPositionFromWorldPosition(position));
    for (let i = 0; i < this.chunks.length; i++) {
      if (index === this.chunks[i].id) {
        return this.chunks[i];
      }
    }
    return null;
  }

  public getChunkFromWorldPosition(position: Position): any {
    if (position === null) return null;
    if (!this.isValidWorldPosition(position)) return null;
    return this.findChunk(position);
  }

  public getChunkPositionFromWorldPosition(worldPosition: Position): Position {
    const x = worldPosition.x - (worldPosition.z % Chunk.DEPTH);
    const y = worldPosition.y - (worldPosition.z % Chunk.DEPTH);
    const sx = (x / Chunk.WIDTH) | 0;
    const sy = (y / Chunk.HEIGHT) | 0;
    const sz = worldPosition.z < 8 ? 0 : 1;
    return new Position(sx, sy, sz);
  }

  public getChunkIndex(sectorPosition: Position): number {
    return sectorPosition.x +
           (sectorPosition.y * this.nSectorsWidth) +
           (sectorPosition.z * this.nSectorsWidth * this.nSectorsHeight);
  }

  public isTopTile(position: Position): boolean {
    for (let z = position.z + 1; z < position.z + 8; z++) {
      const tile = this.getTileFromWorldPosition(new Position(position.x, position.y, z));
      if (tile === null || tile.id !== 0) {
        return false;
      }
    }
    return true;
  }

  public getTopTileFromWorldPosition(position: Position): any {
    const chunk = this.getChunkFromWorldPosition(position);
    if (chunk === null) return null;
    return chunk.getFirstTileFromTop(position);
  }
  
  public targetMonster(monsters: Set<any>): void {
    // Get the next monster
    const monster = monsters.values().next().value;
  
    // You cannot target yourself
    if (monster === window.gameClient.player) {
      return;
    }
  
    // Only monsters can be attacked (not Players, which extend Creature)
    // Use instanceof check instead of constructor.name (which breaks in minified production builds)
    if (!(monster instanceof Creature) || monster instanceof Player) {
      reactNotificationManager.addCancelMessage("You cannot attack this creature.");
      return;
    }
  
    window.gameClient.player!.setTarget(monster);
    window.gameClient.send(new TargetPacket(monster.id));
  }

  public getTileFromWorldPosition(worldPosition: Position): Tile | null{
    const chunk = this.getChunkFromWorldPosition(worldPosition);
    if (chunk === null) return null;
    return chunk.getTileFromWorldPosition(worldPosition);
  }

  public getItemFromPosition(position: Position): any {
    const tile = this.getTileFromWorldPosition(position);
    if (tile === null) return null;
    return tile.peekItem(0xFF);
  }

  public addItem(position: Position, item: any, slot: number): void {
    const tile = this.getTileFromWorldPosition(position);
    if (tile === null) return;
    tile.addItem(item, slot);
  }
}

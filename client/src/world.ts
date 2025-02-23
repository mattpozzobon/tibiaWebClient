import Chunk from "./chunk";
import Clock from "./clock";
import GameClient from "./gameclient";
import Pathfinder from "./pathfinder";
import Position from "./position";
import { TargetPacket } from "./protocol";
import BattleWindow from "./window-battle";

export default class World {
  public width: number;
  public height: number;
  public depth: number;
  public nSectorsWidth: number;
  public nSectorsHeight: number;
  public nSectorsDepth: number;
  public activeCreatures: { [id: string]: any };
  public chunks: any[];
  public pathfinder: any;
  public clock: any;
  public gameClient: GameClient;

  constructor(gameClient: GameClient, width: number, height: number, depth: number) {
    this.gameClient = gameClient;
    this.width = width;
    this.height = height;
    this.depth = depth;

    // Determine the number of sectors on the map
    this.nSectorsWidth = this.width / Chunk.WIDTH;
    this.nSectorsHeight = this.height / Chunk.HEIGHT;
    this.nSectorsDepth = this.depth / Chunk.DEPTH;

    this.activeCreatures = {};
    this.chunks = [];
    this.pathfinder = new Pathfinder(gameClient);
    this.clock = new Clock();
  }

  public handleSelfTeleport(): void {
    this.gameClient.player!.__teleported = true;
    this.gameClient.player!.__serverWalkConfirmation = true;
    this.checkEntityReferences();
    this.checkChunks();
    this.gameClient.renderer.updateTileCache();
    this.gameClient.renderer.minimap.setCenter();
    if (this.gameClient.player!.__movementEvent === null) {
      this.gameClient.player!.__movementEvent = this.gameClient.eventQueue.addEvent(
        this.gameClient.player!.unlockMovement.bind(this.gameClient.player),
        10
      );
    }
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
      if (this.gameClient.isSelf(activeCreature)) return;
      if (!this.gameClient.player!.getChunk().besides(activeCreature.getChunk())) {
        this.gameClient.networkManager.packetHandler.handleEntityRemove(activeCreature.id);
      }
    });
  }

  public handleCreatureMove(id: number | string, position: Position, speed: number): boolean {
    this.gameClient.player!.__serverWalkConfirmation = false;
    return this.__handleCreatureMove(id, position, speed);
  }

  public __handleCreatureMove(id: number | string, position: Position, speed: number): boolean {
    console.log('__handleCreatureMove 1', speed);
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

    console.log('__handleCreatureMove 2', speed);
    creature.moveTo(position, speed);

    if (creature === this.gameClient.player) {
      this.gameClient.player!.setAmbientSound();
    }
    return true;
  }

  public createCreature(id: number | string, creature: any): any {
    this.activeCreatures[id] = creature;
    this.addCreature(creature);
    return (this.gameClient.interface.windowManager.getWindow("battle-window") as BattleWindow).addCreature(creature);
  }

  public getCreature(id: number | string): any {
    if (!this.activeCreatures.hasOwnProperty(id)) return null;
    return this.activeCreatures[id];
  }

  public checkChunks(): void {
    this.chunks = this.chunks.filter((chunk: any) => {
      return this.gameClient.player!.getChunk().besides(chunk);
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

  public findChunk(position: Position): any {
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
    if (monster === this.gameClient.player) {
      return;
    }
  
    // Only monsters can be attacked
    if (monster.constructor.name !== "Creature") {
      return this.gameClient.interface.notificationManager.setCancelMessage("You cannot attack this creature.");
    }
  
    this.gameClient.player!.setTarget(monster);
    this.gameClient.send(new TargetPacket(monster.id));
  }

  public getTileFromWorldPosition(worldPosition: Position): any {
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

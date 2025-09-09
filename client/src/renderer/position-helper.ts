import Position from '../game/position';
import Creature from '../game/creature';
import Tile from '../game/tile';
import { Point } from 'pixi.js';
import Interface from '../ui/interface';

export class PositionHelper {
  private app: any;
  private scalingContainer: any;

  constructor(app: any, scalingContainer: any) {
    this.app = app;
    this.scalingContainer = scalingContainer;
  }

  public static getStaticScreenPosition(position: Position): Position {
    const projectedPlayer = window.gameClient.player!.getPosition().projected();
    const projectedThing = position.projected();
    const x = ((Interface.TILE_WIDTH-1)/2) + window.gameClient.player!.getMoveOffset().x + projectedThing.x - projectedPlayer.x;
    const y = ((Interface.TILE_HEIGHT-1)/2) + window.gameClient.player!.getMoveOffset().y + projectedThing.y - projectedPlayer.y;
    return new Position(x, y, 0);
  }

  public static getCreatureScreenPosition(creature: Creature): Position {
    const staticPosition = PositionHelper.getStaticScreenPosition(creature.getPosition());
    const creatureMoveOffset = creature.getMoveOffset();
    const elevationOffset = creature.renderer.getElevationOffset();

    return new Position(
      staticPosition.x - creatureMoveOffset.x - elevationOffset,
      staticPosition.y - creatureMoveOffset.y - elevationOffset,
      0
    );
  }

  public getWorldCoordinates(event: MouseEvent): Tile | null {
    const global = new Point();
    this.app.renderer.events.mapPositionToPoint(global, event.clientX, event.clientY);
    const local = this.scalingContainer.toLocal(global);

    const sX = local.x / Interface.TILE_SIZE;
    const sY = local.y / Interface.TILE_SIZE;

    const player = window.gameClient.player!;
    const pos = player.getPosition();
    const move = player.getMoveOffset(); // in tile units

    const centerX = (Interface.TILE_WIDTH  - 1) / 2;
    const centerY = (Interface.TILE_HEIGHT - 1) / 2;

    const worldX = Math.floor((sX - centerX - move.x) + 1e-7) + pos.x;
    const worldY = Math.floor((sY - centerY - move.y) + 1e-7) + pos.y;

    const p = new Position(worldX, worldY, pos.z);
    const chunk = window.gameClient.world.getChunkFromWorldPosition(p);
    return chunk ? chunk.getFirstTileFromTop(p.projected()) : null;
  }

  public getOverlayScreenPosition(creature: Creature): { x: number, y: number } {
    const screenPos: Position = PositionHelper.getCreatureScreenPosition(creature);
    const scale = this.scalingContainer.scale.x;
    const tileSize = Interface.TILE_SIZE;

    let x = (screenPos.x * tileSize) * scale + this.scalingContainer.x;
    let y = (screenPos.y * tileSize) * scale + this.scalingContainer.y;

    y -= 16 * scale;
    x += 4 * scale;

    return { x, y };
  }
}

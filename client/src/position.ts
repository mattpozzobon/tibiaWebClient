import { CONST } from "./helper/appContext";

class Position {
  x: number;
  y: number;
  z: number;

  static NULL: Position = new Position(0, 0, 0);

  constructor(x: number, y: number, z: number) {
    /*
     * Class Position
     * Wrapper for a generic 3D vector that represents a position or coordinates
     */
    this.x = x;
    this.y = y;
    this.z = z;
  }

  subtract(position: Position): Position {
    return new Position(this.x - position.x, this.y - position.y, this.z - position.z);
  }

  add(position: Position): Position {
    return new Position(this.x + position.x, this.y + position.y, this.z + position.z);
  }

  above(): Position {
    return new Position(this.x, this.y, this.z + 1);
  }

  unprojected(): Position {
    let z = this.z % 8;
    return new Position(this.x + z, this.y + z, z);
  }

  projected(): Position {
    let z = this.z % 8;
    return new Position(this.x - z, this.y - z, z);
  }

  fromOpcode(opcode: number): Position | undefined {
    switch (opcode) {
      case CONST.DIRECTION.NORTH:
        return this.north();
      case CONST.DIRECTION.EAST:
        return this.east();
      case CONST.DIRECTION.SOUTH:
        return this.south();
      case CONST.DIRECTION.WEST:
        return this.west();
      case CONST.DIRECTION.NORTHEAST:
        return this.northeast();
      case CONST.DIRECTION.SOUTHEAST:
        return this.southeast();
      case CONST.DIRECTION.SOUTHWEST:
        return this.southwest();
      case CONST.DIRECTION.NORTHWEST:
        return this.northwest();
      default:
        return undefined;
    }
  }

  copy(): Position {
    return new Position(this.x, this.y, this.z);
  }

  west(): Position {
    return new Position(this.x - 1, this.y, this.z);
  }

  north(): Position {
    return new Position(this.x, this.y - 1, this.z);
  }

  east(): Position {
    return new Position(this.x + 1, this.y, this.z);
  }

  south(): Position {
    return new Position(this.x, this.y + 1, this.z);
  }

  northwest(): Position {
    return new Position(this.x - 1, this.y - 1, this.z);
  }

  northeast(): Position {
    return new Position(this.x + 1, this.y - 1, this.z);
  }

  southeast(): Position {
    return new Position(this.x + 1, this.y + 1, this.z);
  }

  southwest(): Position {
    return new Position(this.x - 1, this.y + 1, this.z);
  }

  up(): Position {
    return new Position(this.x, this.y, this.z + 1);
  }

  down(): Position {
    return new Position(this.x, this.y, this.z - 1);
  }

  random(): Position {
    let random = Math.floor(Math.random() * 4);
    switch (random) {
      case 0:
        return this.west();
      case 1:
        return this.north();
      case 2:
        return this.east();
      case 3:
        return this.south();
      default:
        return this.copy();
    }
  }

  getLookDirection(position: Position): number | null {
    if (this.z !== position.z) {
      return null;
    }

    let diff = position.subtract(this);

    if (diff.x === 0) {
      switch (diff.y) {
        case -1:
          return CONST.DIRECTION.NORTH;
        case 0:
          return null;
        case 1:
          return CONST.DIRECTION.SOUTH;
      }
    }

    if (diff.x === -1) {
      switch (diff.y) {
        case -1:
          return CONST.DIRECTION.NORTHWEST;
        case 0:
          return CONST.DIRECTION.WEST;
        case 1:
          return CONST.DIRECTION.SOUTHWEST;
      }
    }

    if (diff.x === 1) {
      switch (diff.y) {
        case -1:
          return CONST.DIRECTION.NORTHEAST;
        case 0:
          return CONST.DIRECTION.EAST;
        case 1:
          return CONST.DIRECTION.SOUTHEAST;
      }
    }

    return null;
  }

  isDiagonal(position: Position): boolean {
    return Math.abs(this.x - position.x) === 1 && Math.abs(this.y - position.y) === 1;
  }

  toString(): string {
    return `${this.x}, ${this.y}, ${this.z}`;
  }

  serialize(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y, z: this.z };
  }

  equals(position: Position): boolean {
    return this.x === position.x && this.y === position.y && this.z === position.z;
  }

  inRange(position: Position, range: number): boolean {
    return (
      this.z === position.z &&
      Math.sqrt(Math.pow(this.x - position.x, 2) + Math.pow(this.y - position.y, 2)) < range
    );
  }

  besides(position: Position): boolean {
    if (this.z !== position.z) {
      return false;
    }
    return Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y)) <= 1;
  }
}

export default Position;

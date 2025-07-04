import BinaryHeap from "../utils/binary-heap";
import { CONST } from "../helper/appContext";
import Position from "../game/position";
import Keyboard from "../input/keyboard";


export interface IPathNode {
  __position: Position;
  __visited: boolean;
  __closed: boolean;
  __g: number;
  __h: number;
  __f: number;
  __parentNode?: IPathNode | null;
  neighbours: IPathNode[];
  isOccupied(): boolean;
  cleanPathfinding(): void;
  getCost(parent: IPathNode): number;
}

export default class Pathfinder {
 
  private __pathfindCache: any[];
  private __dirtyNodes: IPathNode[];

  constructor() {
     
    // Cache to keep the tiles to walk on
    this.__pathfindCache = [];
    this.__dirtyNodes = [];
  }

  public search(from: IPathNode, to: IPathNode): IPathNode[] {
    // Clean up previously modified nodes
    this.__dirtyNodes.forEach((node) => node.cleanPathfinding());
    this.__dirtyNodes = [from];
  
    // Initialize heuristic for the starting node
    from.__h = this.heuristic(from, to);
  
    const openHeap = new BinaryHeap<IPathNode>();
    openHeap.push(from);
  
    while (openHeap.size() > 0) {
      // Grab the lowest f(x) node from the heap.
      const currentNode = openHeap.pop()!;  // non-null assertion operator
  
      // End case – result has been found, return the traced path.
      if (currentNode === to) {
        return this.pathTo(currentNode);
      }
  
      // Mark the node as closed.
      currentNode.__closed = true;
  
      // Process each neighbor of the current node.
      for (let i = 0; i < currentNode.neighbours.length; i++) {
        const neighbourNode = currentNode.neighbours[i];
  
        // Skip nodes that are already closed or occupied.
        if (neighbourNode.__closed || neighbourNode.isOccupied()) {
          continue;
        }
  
        // Diagonal movement penalty.
        const penalty = currentNode.__position.isDiagonal(neighbourNode.__position)
          ? 2 * Math.SQRT2
          : 1;
  
        // Cost to get to this neighbor.
        const gScore = currentNode.__g + penalty * neighbourNode.getCost(currentNode);
        const visited = neighbourNode.__visited;
  
        if (!visited || gScore < neighbourNode.__g) {
          // Found a better path to the neighbor.
          neighbourNode.__visited = true;
          neighbourNode.__parentNode = currentNode;
          neighbourNode.__h = neighbourNode.__h || this.heuristic(neighbourNode, to);
          neighbourNode.__g = gScore;
          neighbourNode.__f = neighbourNode.__g + neighbourNode.__h;
  
          this.__dirtyNodes.push(neighbourNode);
  
          if (!visited) {
            openHeap.push(neighbourNode);
          } else {
            openHeap.rescoreElement(neighbourNode);
          }
        }
      }
    }
    // No path was found; return an empty array.
    return [];
  }
  

  public heuristic(from: IPathNode, to: IPathNode): number {
    // Manhattan distance heuristic for pathfinding.
    return (
      Math.abs(from.__position.x - to.__position.x) +
      Math.abs(from.__position.y - to.__position.y)
    );
  }

  public pathTo(tile: IPathNode): IPathNode[] {
    // Trace the path backwards from the given tile.
    const path: IPathNode[] = [];
    while (tile.__parentNode) {
      path.unshift(tile);
      tile = tile.__parentNode;
    }
    return path;
  }

  public findPath(begin: Position, stop: Position): void {
    let start = window.gameClient.world.getTileFromWorldPosition(begin);
    if (start === null) {
      window.gameClient.interface.setCancelMessage("Start position is invalid.");
      return;
    }
    const end = window.gameClient.world.getTileFromWorldPosition(stop);
    if (end === null) {
      window.gameClient.interface.setCancelMessage("End position is invalid.");
      return;
    }
  
    const path = this.search(start, end);
  
    if (path.length === 0) {
      window.gameClient.interface.setCancelMessage("There is no way.");
      return;
    }
  
    // Determine the relative movement sequence to take.
    const movementSequence = path.map((node: IPathNode) => {
      const tmp = start?.__position.getLookDirection(node.__position);
      start = window.gameClient.world.getTileFromWorldPosition(node.__position);
      return tmp;
    });
  
    this.setPathfindCache(movementSequence);
  }
  

  public setPathfindCache(path: any[] | null): void {
    if (path === null) {
      this.__pathfindCache = [];
    } else {
      this.__pathfindCache = path;
      this.handlePathfind();
    }
  }

  public getNextMove(): any | null {
    if (this.__pathfindCache.length === 0) {
      return null;
    }
    return this.__pathfindCache.shift();
  }

  public handlePathfind(): void {
    // Delegate the next pathfinding move to the keyboard handler.
    switch (this.getNextMove()) {
      case CONST.DIRECTION.NORTH:
        return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.UP_ARROW);
      case CONST.DIRECTION.EAST:
        return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.RIGHT_ARROW);
      case CONST.DIRECTION.SOUTH:
        return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.DOWN_ARROW);
      case CONST.DIRECTION.WEST:
        return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.LEFT_ARROW);
      // case CONST.DIRECTION.NORTH_EAST:
      //   return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.KEYPAD_9);
      // case CONST.DIRECTION.SOUTH_EAST:
      //   return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.KEYPAD_3);
      // case CONST.DIRECTION.SOUTH_WEST:
      //   return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.KEYPAD_1);
      // case CONST.DIRECTION.NORTH_WEST:
      //   return window.gameClient.keyboard.handleCharacterMovement(Keyboard.KEYS.KEYPAD_7);
      default:
        return;
    }
  }
}

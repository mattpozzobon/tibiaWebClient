import { IPathNode } from "../core/pathfinder";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import ConditionManager from "./condition";
import Creature from "./creature";
import Item from "./item";
import Position from "./position";
import Thing from "./thing";


export default class Tile extends Thing implements IPathNode {
  __position: Position;
  public __renderElevation: number = 0;
  private __animations: Set<any> = new Set();
  private __deferredCreatures: Set<any> = new Set();
  flags: number;
  zone: number;
  items: Item[];
  monsters: Set<Creature> = new Set();

  // Pathfinding properties
  public __f: number = 0;
  public __g: number = 0;
  public __h: number = 0;
  public __visited: boolean = false;
  public __closed: boolean = false;
  public __parentNode: IPathNode | null = null;
  public neighbours: IPathNode[] = []; // Store neighboring tiles for pathfinding

  constructor(tile: { id: number; flags: number; zone: number; items: Item[] }, position: Position) {
    super(tile.id);
    
    this.flags = tile.flags;
    this.zone = tile.zone;
    this.__position = position;
    this.items = tile.items;
    this.cleanPathfinding();
  }

  getFriction(): number {
    return this.getDataObject().properties.speed || 100;
  }

  isNoLogoutZone(): boolean {
    return Boolean(this.flags & 8);
  }

  isProtectionZone(): boolean {
    return Boolean(this.flags & 1);
  }

  getCost(): number {
    if (!this.hasFlag("DatFlagGround")) {
      return 1;
    }
    return this.getDataObject().properties.speed;
  }

  cleanPathfinding(): void {
    this.__f = 0;
    this.__g = 0;
    this.__h = 0;
    this.__visited = false;
    this.__closed = false;
    this.__parent = null;
  }

  getPosition(): Position {
    return this.__position;
  }

  addElevation(elevation: number): void {
    this.setElevation(Math.min(1, this.__renderElevation + elevation / 32));
  }

  deleteAnimation(animation: any): void {
    this.__animations.delete(animation);
  }

  addAnimation(animation: any): void {
    this.__animations.add(animation);
  }

  setElevation(elevation: number): void {
    this.__renderElevation = elevation;
  }

  hasMaximumElevation(): boolean {
    return this.__renderElevation === 1;
  }

  addCreature(creature: any): void {
    if (
      creature ===  window.gameClient.player &&
      this.isProtectionZone() &&
      ! window.gameClient.player!.hasCondition(ConditionManager.PROTECTION_ZONE)
    ) {
      window.gameClient.player!.addCondition(ConditionManager.PROTECTION_ZONE);
    }
    this.monsters.add(creature);
  }

  removeCreature(creature: any): void {
    if (
      creature === window.gameClient.player &&
      this.isProtectionZone() &&
      window.gameClient.player!.hasCondition(ConditionManager.PROTECTION_ZONE)
    ) {
      window.gameClient.player!.removeCondition(5);
    }
    this.monsters.delete(creature);
  }

  isItemBlocked(): boolean {
    for(let i = 0; i < this.items.length; i++) {
      if(!this.items[i].isWalkable()) {
        return true;
      }
    }
  
    return false;
  }

  isTranslucent(): boolean {
    return this.hasFlag(PropBitFlag.DatFlagTranslucent);
  }

  isHookSouth(): boolean {
    return this.items.some(item => item.isHookSouth());
  }

  isHookEast(): boolean {
    return this.items.some(item => item.isHookEast());
  }

  isWalkable(): boolean {
    return !this.hasFlag(PropBitFlag.DatFlagNotWalkable);
  } 

  isOccupied(): boolean {
    if (this.id === 0 || !this.isWalkable() || this.isItemBlocked()) {
      return true;
    }
    return Array.from(this.monsters).some(monster => monster.type !== 0);
  }

  addItem(item: Item, slot: number): void {
    item.__parent = this;
    const selectedItem = this.peekItem(slot);
    if (!selectedItem) {
      this.items.push(item);
      return;
    }
    if (slot === 0xff) {
      this.items.push(item);
    } else {
      this.items.splice(slot, 0, item);
    }
  }

  removeItem(index: number, count: number): void {
    if (index === 0xff) {
      index = this.items.length - 1;
    }
    if (count === 0 || this.items[index].isFluidContainer()) {
      this.items.splice(index, 1);
      return;
    }
    this.items[index].count -= count;
    if (this.items[index].count === 0) {
      this.items.splice(index, 1);
    }
  }

  peekItem(slot: number): Item | null {
    if (this.items.length === 0) {
      return null;
    }
    return slot === 0xff ? this.items[this.items.length - 1] : this.items[slot];
  }

  getPattern(): Position {
    const proto = this.getDataObject().getFrameGroup(FrameGroup.NONE);
    return new Position(
      this.__position.x % proto.pattern.x,
      this.__position.y % proto.pattern.y,
      this.__position.z % proto.pattern.z
    );
  }
}

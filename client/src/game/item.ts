import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import Position from "./position";
import Thing from "./thing";
import Tile from "./tile";

export default class Item extends Thing {
    
    count: number;
  
    constructor(id: number, count: number) {
      /*
       * Class Item
       * Container for an item with an identifier and count
       *
       * API:
       *
       * @Item.getCount() - returns the count of the item
       * @Item.isHookSouth() - returns true if the item is a hookable item south
       * @Item.isHookEast() - returns true if the item is a hookable item east
       * @Item.isHangable() - returns true if the item is hangable
       *
       */
      super( id);
      
      this.count = count;
    }
  
    getPattern(): Position {
      /*
       * Function Item.getPattern
       * Returns the pattern of an item: this may be different for various types of items (e.g., stackables, hangables, and liquids)
       */
  
      let frameGroup = this.getFrameGroup(FrameGroup.NONE);
  
      if (this.isHangable()) {
        return this.__getHangablePattern();
      }
  
      if (this.isStackable() && frameGroup.pattern.x === 4 && frameGroup.pattern.y === 2) {
        return this.__getCountPattern();
      }
  
      return Position.NULL;
    }
  
    getCount(): number {
      /*
       * Function Item.getCount
       * Returns the count of an item
       */
      return this.count;
    }
  
    isHookSouth(): boolean {
      /*
       * Function Item.isHookSouth
       * Returns true if the item can be hooked on south-facing walls
       */
      return this.hasFlag(PropBitFlag.DatFlagHookSouth);
    }
  
    isHookEast(): boolean {
      /*
       * Function Item.isHookEast
       * Returns true if the item can be hooked on east-facing walls
       */
      return this.hasFlag(PropBitFlag.DatFlagHookEast);
    }
  
    isHangable(): boolean {
      /*
       * Function Item.isHangable
       * Returns true if the item can be used with something else
       */
      return this.hasFlag(PropBitFlag.DatFlagHangable);
    }
  
    isPickupable(): boolean {
      /*
       * Function Item.isPickupable
       * Returns true if the item can be picked up
       */
      return this.hasFlag(PropBitFlag.DatFlagPickupable);
    }
  
    isElevation(): boolean {
      /*
       * Function Item.isElevation
       * Returns true when an item is elevated
       */
      return this.hasFlag(PropBitFlag.DatFlagElevation);
    }
  
    isWalkable(): boolean {
      /*
       * Function Item.isWalkable
       * Returns true when an item is walkable
       */
      return !this.hasFlag(PropBitFlag.DatFlagNotWalkable);
    }
  
    isMoveable(): boolean {
      /*
       * Function Item.isMoveable
       * Returns true if the item is moveable
       */
      return !this.hasFlag(PropBitFlag.DatFlagNotMoveable);
    }
  
    isStackable(): boolean {
      /*
       * Function Item.isStackable
       * Returns true when an item has its stackable flag set
       */
      return this.hasFlag(PropBitFlag.flags.DatFlagStackable);
    }
  
    private __getHangablePattern(): Position {
      /*
       * Function Item.__getHangablePattern
       * Returns the hangable pattern of a thing that can be hooked on a wall
       */
  
      if (this.__parent instanceof Tile) {
        if (this.__parent.isHookSouth()) {
          return new Position(1, 0, 0);
        } else if (this.__parent.isHookEast()) {
          return new Position(2, 0, 0);
        }
      }
  
      return Position.NULL;
    }
  
    private __getCountPattern(): Position {
      /*
       * Function Item.__getCountPattern
       * Returns the pattern for stackable items that shows the respective item count
       */
  
      let count = this.getCount();
  
      if (count === 1) {
        return Position.NULL;
      } else if (count === 2) {
        return new Position(1, 0, 0);
      } else if (count === 3) {
        return new Position(2, 0, 0);
      } else if (count === 4) {
        return new Position(3, 0, 0);
      } else if (count === 5) {
        return new Position(4, 0, 0);
      } else if (count < 10) {
        return new Position(0, 1, 0);
      } else if (count < 25) {
        return new Position(1, 1, 0);
      } else if (count < 50) {
        return new Position(2, 1, 0);
      } else {
        return new Position(3, 1, 0);
      }
    }
  }
  
import FrameGroup from "./frame-group";
import GameClient from "./gameclient";
import Item from "./item";
import Position from "./position";

class FluidThing extends Item {
    /*
     * Class FluidThing
     * Container for fluid containers (e.g., troughs and vials) but also splashes (e.g., blood)
     */
  
    static readonly FLUID_TYPES = {
      NONE: 0,
      WATER: 1,
      BLOOD: 2,
      BEER: 3,
      SLIME: 4,
      LEMONADE: 5,
      MILK: 6,
      MANA: 7,
      WATER2: 9,
      HEALTH: 10,
      OIL: 11,
      SLIME2: 12,
      URINE: 13,
      COCONUTMILK: 14,
      WINE: 15,
      MUD: 19,
      FRUITJUICE: 21,
      LAVA: 26,
      RUM: 27
    };
  
    static readonly FLUID_COLORS = {
      TRANSPARENT: 0,
      BLUE: 1,
      RED: 2,
      BROWN: 3,
      GREEN: 4,
      YELLOW: 5,
      WHITE: 6,
      PURPLE: 7
    };
  
    constructor(id: number, count: number) {
      super( id, count);
    }
  
    getPattern(): Position {
      /*
       * Function FluidThing.getPattern
       * Returns the pattern for the liquid item
       */
      let frameGroup = this.getFrameGroup(FrameGroup.NONE);
  
      // Map it to the correct sprite index
      let index = this.__getLiquidPatternIndex();
  
      let x = (index % 4) % frameGroup.pattern.x;
      let y = Math.floor(index / 4) % frameGroup.pattern.y;
  
      // Return the pattern
      return new Position(x, y, 0);
    }
  
    private __getLiquidPatternIndex(): number {
      /*
       * Function FluidThing.__getLiquidPatternIndex
       * Returns the index of the liquid pattern
       */
      switch (this.count) {
        case FluidThing.FLUID_TYPES.NONE:
          return FluidThing.FLUID_COLORS.TRANSPARENT;
        case FluidThing.FLUID_TYPES.WATER:
        case FluidThing.FLUID_TYPES.WATER2:
          return FluidThing.FLUID_COLORS.BLUE;
        case FluidThing.FLUID_TYPES.MANA:
          return FluidThing.FLUID_COLORS.PURPLE;
        case FluidThing.FLUID_TYPES.BEER:
        case FluidThing.FLUID_TYPES.OIL:
        case FluidThing.FLUID_TYPES.MUD:
        //case FluidThing.FLUID_TYPES.TEA:
        //case FluidThing.FLUID_TYPES.MEAD:
        case FluidThing.FLUID_TYPES.RUM:
          return FluidThing.FLUID_COLORS.BROWN;
        case FluidThing.FLUID_TYPES.BLOOD:
        case FluidThing.FLUID_TYPES.HEALTH:
        case FluidThing.FLUID_TYPES.LAVA:
          return FluidThing.FLUID_COLORS.RED;
        case FluidThing.FLUID_TYPES.SLIME:
        case FluidThing.FLUID_TYPES.SLIME2:
          return FluidThing.FLUID_COLORS.GREEN;
        case FluidThing.FLUID_TYPES.LEMONADE:
        case FluidThing.FLUID_TYPES.URINE:
        case FluidThing.FLUID_TYPES.FRUITJUICE:
          return FluidThing.FLUID_COLORS.YELLOW;
        case FluidThing.FLUID_TYPES.MILK:
        case FluidThing.FLUID_TYPES.COCONUTMILK:
          return FluidThing.FLUID_COLORS.WHITE;
        case FluidThing.FLUID_TYPES.WINE:
          return FluidThing.FLUID_COLORS.PURPLE;
        default:
          return FluidThing.FLUID_COLORS.TRANSPARENT;
      }
    }
  }
  
  export default FluidThing;
  
import { CONST } from '../helper/appContext';

class ConditionManager {
    
  private __player: any;
  private __conditions: Set<number>;
  
  static readonly DRUNK = CONST.CONDITION.DRUNK;
  static readonly POISONED = CONST.CONDITION.POISONED;
  static readonly BURNING = CONST.CONDITION.BURNING;
  static readonly ELECTRIFIED = CONST.CONDITION.ELECTRIFIED;
  static readonly INVISIBLE = CONST.CONDITION.INVISIBLE;
  static readonly PROTECTION_ZONE = CONST.CONDITION.PROTECTION_ZONE;
  static readonly COMBAT_LOCK = CONST.CONDITION.COMBAT_LOCK;
  static readonly SUPPRESS_DRUNK = CONST.CONDITION.SUPPRESS_DRUNK;
  static readonly HEALING = CONST.CONDITION.HEALING;
  static readonly REGENERATION = CONST.CONDITION.REGENERATION;
  static readonly MORPH = CONST.CONDITION.MORPH;
  static readonly MAGIC_SHIELD = CONST.CONDITION.MAGIC_SHIELD;
  static readonly MAGIC_FLAME = CONST.CONDITION.MAGIC_FLAME;
  static readonly SATED = CONST.CONDITION.SATED;
  static readonly HASTE = CONST.CONDITION.HASTE;
  static readonly ARENA = CONST.CONDITION.ARENA;
  static readonly HEALTH_HEALING = CONST.CONDITION.HEALTH_HEALING;
  static readonly MANA_HEALING = CONST.CONDITION.MANA_HEALING;
  static readonly ENERGY_HEALING = CONST.CONDITION.ENERGY_HEALING;
  
  constructor( player: any, conditions: number[]) {
    /*
      * Class ConditionManager
      * Handler for player conditions
      */
    
    this.__player = player;
    this.__conditions = new Set(conditions);
  }

  has(cid: number): boolean {
    /*
      * Function ConditionManager.has
      * Returns true if the player is currently suffering from the condition
      */
    return this.__conditions.has(cid);
  }


  add(cid: number): void {
    /*
      * Function ConditionManager.add
      * Adds a condition to the list of conditions
      */
    this.__conditions.add(cid);

    // Update the status bar
    if (this.__player === window.gameClient.player) {
      // window.gameClient.interface.statusBar.update();
    }

    if (this.__player.hasCondition(ConditionManager.DRUNK)) {
      if (!this.__player.hasCondition(ConditionManager.SUPPRESS_DRUNK)) {
        const screen = document.getElementById("screen");
        if (screen) screen.style.filter = "blur(2px)";
      }
    }
  }

  remove(cid: number): void {
    /*
      * Function ConditionManager.remove
      * Removes a condition from the list of conditions
      */
    this.__conditions.delete(cid);


    // Update the status bar
    if (this.__player === window.gameClient.player) {
      //window.gameClient.interface.statusBar.update();
    }

    if (!this.__player.hasCondition(ConditionManager.DRUNK)) {
      const screen = document.getElementById("screen");
      if (screen) screen.style.filter = "";
    }
  }
}

export default ConditionManager;
  
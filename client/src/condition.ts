import GameClient from "./gameclient";

class ConditionManager {
    
    private __player: any;
    private __conditions: Set<number>;
  
    static readonly DRUNK = 0;
    static readonly POISONED = 1;
    static readonly BURNING = 2;
    static readonly ELECTRIFIED = 3;
    static readonly INVISIBLE = 4;
    static readonly PROTECTION_ZONE = 5;
    static readonly COMBAT_LOCK = 6;
    static readonly SUPPRESS_DRUNK = 7;
    static readonly LIGHT = 8;
    static readonly HEALING = 9;
    static readonly REGENERATION = 10;
    static readonly MORPH = 11;
    static readonly MAGIC_SHIELD = 12;
    static readonly SATED = 14;
    static readonly HASTE = 15;
  
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
        window.gameClient.interface.statusBar.update();
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
        window.gameClient.interface.statusBar.update();
      }
  
      if (!this.__player.hasCondition(ConditionManager.DRUNK)) {
        const screen = document.getElementById("screen");
        if (screen) screen.style.filter = "";
      }
    }
  }
  
  export default ConditionManager;
  
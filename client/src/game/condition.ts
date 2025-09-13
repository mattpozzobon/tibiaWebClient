class ConditionManager {
    
    private __player: any;
    private __conditions: Set<number>;
    private __listeners: Map<string, Set<Function>> = new Map();
  
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

    // Event system methods
    on(event: string, callback: Function): void {
      if (!this.__listeners.has(event)) {
        this.__listeners.set(event, new Set());
      }
      this.__listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function): void {
      const listeners = this.__listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    }

    emit(event: string, ...args: any[]): void {
      console.log(`ConditionManager: Emitting event '${event}' with args:`, args);
      const listeners = this.__listeners.get(event);
      if (listeners) {
        console.log(`ConditionManager: Found ${listeners.size} listeners for '${event}'`);
        listeners.forEach(callback => callback(...args));
      } else {
        console.log(`ConditionManager: No listeners found for '${event}'`);
      }
    }
  
    add(cid: number): void {
      /*
       * Function ConditionManager.add
       * Adds a condition to the list of conditions
       */
      this.__conditions.add(cid);

      // Emit condition added event
      this.emit('conditionAdded', cid);

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

      // Emit condition removed event
      this.emit('conditionRemoved', cid);

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
  
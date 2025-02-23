export default class EventEmitter {
    private events: Record<string, Set<(...args: any[]) => void>>;
  
    constructor() {
      /*
       * Class EventEmitter
       * Subscribes to events and waits for emit
       */
      this.events = {};
    }
  
    emit(which: string, ...args: any[]): void {
      /*
       * Function EventEmitter.emit
       * Emits a call to the event emitter and executes callbacks
       */
  
      // Not available
      if (!this.events.hasOwnProperty(which)) {
        return;
      }
  
      // Execute the callback
      this.events[which].forEach((callback) => callback(...args));
    }
  
    on(which: string, callback: (...args: any[]) => void): (...args: any[]) => void {
      /*
       * Function EventEmitter.on
       * Subscribes a callback to an event
       */
  
      // Create a new event of this type if it doesn't exist
      if (!this.events.hasOwnProperty(which)) {
        this.events[which] = new Set();
      }
  
      // Add the function to the set
      this.events[which].add(callback);
  
      // Return a reference to the callback for potential removal later
      return callback;
    }
  
    off(which: string, callback: (...args: any[]) => void): void {
      /*
       * Function EventEmitter.off
       * Unsubscribe a callback from an event
       */
  
      // Not available
      if (!this.events.hasOwnProperty(which)) {
        return;
      }
  
      this.events[which].delete(callback);
    }
  
    clear(): void {
      /*
       * Function EventEmitter.clear
       * Clears all event listeners
       */
  
      this.events = {};
    }
  }
  
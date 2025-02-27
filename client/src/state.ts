export  default class State {
  private __state: Record<string, any>;

  constructor() {
    /*
     * Class State
     * Wrapper that contains properties for state variables with optional callbacks after getting/setting the property
     * For example: updating the DOM after a creature's health is changed
     */
    this.__state = {};
  }

  add<T>(key: string, callback?: (value: T) => void): void {
    /*
     * Function State.add
     * Creates a new property in the state variable
     */

    // Initialize the state variable
    this.__state[key] = null;

    // Define the getter & setter dynamically
    Object.defineProperty(this, key, this.__createPattern<T>(key, callback));
  }

  private __createPattern<T>(key: string, callback?: (value: T) => void): PropertyDescriptor {
    /*
     * Function State.__createPattern
     * Creates a new setter and getter pattern for a property
     */

    return {
      get: (): T => this.__state[key],

      set: (value: T): void => {
        this.__state[key] = value;

        // If a callback was supplied, execute it with the set value
        if (callback) {
          callback(value);
        }
      },
      enumerable: true,
      configurable: true,
    };
  }

  // Index signature to allow dynamic properties
  [key: string]: any;
}

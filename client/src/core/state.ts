// core/state.ts
export type Listener<T = any> = (value: T) => void;

export default class State {
  private __state: Record<string, any> = {};
  private __listeners = new Map<string, Set<Listener>>();

  // 👇 allow dynamic keys like state.health, state.mana, etc.
  [key: string]: any;

  add<T>(key: string, callback?: (value: T) => void): void {
    this.__state[key] = null;

    Object.defineProperty(this, key, {
      get: (): T => this.__state[key],
      set: (value: T): void => {
        this.__state[key] = value;

        if (callback) {
          try { callback(value); } catch {}
        }

        const set = this.__listeners.get(key);
        if (set) for (const fn of set) try { (fn as Listener<T>)(value); } catch {}
      },
      enumerable: true,
      configurable: true,
    });
  }

  on<T = any>(key: string, fn: Listener<T>): () => void {
    const set = this.__listeners.get(key) ?? new Set<Listener>();
    set.add(fn as Listener);
    this.__listeners.set(key, set);
    return () => {
      const s = this.__listeners.get(key);
      if (!s) return;
      s.delete(fn as Listener);
      if (s.size === 0) this.__listeners.delete(key);
    };
  }
}

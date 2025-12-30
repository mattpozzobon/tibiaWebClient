// core/utils/emitter.ts
export type Unsubscribe = () => void;


export class Emitter<TEvents extends Record<string, any>> {
  private map = new Map<keyof TEvents, Set<Function>>();

  on<K extends keyof TEvents>(key: K, fn: (payload: TEvents[K]) => void): Unsubscribe {
    const set = this.map.get(key) ?? new Set();
    set.add(fn);
    this.map.set(key, set);
    return () => set.delete(fn);
  }

  emit<K extends keyof TEvents>(key: K, payload: TEvents[K]): void {
    const set = this.map.get(key);
    if (!set) return;
    for (const fn of set) (fn as any)(payload);
  }
}

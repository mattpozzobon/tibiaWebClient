export class MemoryManager {
  private static caches = new Map<string, Map<any, any>>();
  private static cleanupCallbacks = new Set<() => void>();

  static registerCache(name: string, cache: Map<any, any>): void {
    this.caches.set(name, cache);
  }

  static registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  static unregisterCleanup(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  static cleanup(): void {
    // Clear all registered caches
    for (const [name, cache] of this.caches) {
      cache.clear();
      console.log(`Cleared cache: ${name}`);
    }

    // Run all cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }

    // Clear cleanup callbacks
    this.cleanupCallbacks.clear();
    
    console.log('Memory cleanup completed');
  }

  static getMemoryStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const [name, cache] of this.caches) {
      stats[name] = cache.size;
    }

    stats.cleanupCallbacks = this.cleanupCallbacks.size;
    
    return stats;
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    MemoryManager.cleanup();
  });
}

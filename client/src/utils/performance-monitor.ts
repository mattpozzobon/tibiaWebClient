import { PERFORMANCE_LABELS } from '../config/minimap-config';

export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();

  static start(label: string): void {
    performance.mark(`${label}-start`);
  }

  static end(label: string): number {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label, 'measure')[0];
    const duration = measure.duration;
    
    // Store measurement for averaging
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    const measurements = this.measurements.get(label)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }
    
    return duration;
  }

  static getAverage(label: string): number {
    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  static getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    for (const [label] of this.measurements) {
      metrics[label] = this.getAverage(label);
    }
    return metrics;
  }

  static logMetrics(): void {
    console.log('Performance Metrics:', this.getMetrics());
  }
}

// Performance measurement decorator
export function measurePerformance<T extends (...args: any[]) => any>(
  label: string,
  fn: T
): T {
  return ((...args: any[]) => {
    PerformanceMonitor.start(label);
    const result = fn(...args);
    const duration = PerformanceMonitor.end(label);
    
    // Log slow operations
    if (duration > 16) { // More than one frame at 60fps
      console.warn(`Slow operation: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
}

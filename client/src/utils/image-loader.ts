import { MINIMAP_CONFIG, MarkerIcon } from '../config/minimap-config';

export class ImageLoader {
  private static cache = new Map<string, HTMLImageElement>();
  private static loadingPromises = new Map<string, Promise<HTMLImageElement>>();

  static async loadImage(src: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    // Return existing loading promise if available
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    // Create new loading promise
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        this.loadingPromises.delete(src);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });

    this.loadingPromises.set(src, promise);
    return promise;
  }

  static async preloadMarkerImages(): Promise<Map<string, HTMLImageElement>> {
    const imageMap = new Map<string, HTMLImageElement>();
    
    // Load all marker images in parallel
    const loadPromises = MINIMAP_CONFIG.MARKER_ICONS.map(async (iconName) => {
      const src = `/data/minimap/${iconName}`;
      try {
        const img = await this.loadImage(src);
        imageMap.set(iconName, img);
      } catch (error) {
        console.error(`Failed to load marker image: ${iconName}`, error);
      }
    });

    await Promise.all(loadPromises);
    return imageMap;
  }

  static getCachedImage(src: string): HTMLImageElement | null {
    return this.cache.get(src) || null;
  }

  static clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  static getCacheSize(): number {
    return this.cache.size;
  }
}

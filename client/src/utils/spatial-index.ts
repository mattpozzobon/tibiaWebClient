import { MapMarker } from '../types/map-marker';
import { MINIMAP_CONFIG } from '../config/minimap-config';
import { SpatialIndex } from '../types/minimap-types';

export class MarkerSpatialIndex {
  private index: SpatialIndex = {};
  private gridSize: number = MINIMAP_CONFIG.SPATIAL_GRID_SIZE;

  updateIndex(markers: MapMarker[]): void {
    this.index = {};
    
    markers.forEach(marker => {
      const key = this.getGridKey(marker.x, marker.y);
      if (!this.index[key]) {
        this.index[key] = [];
      }
      this.index[key].push(marker);
    });
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX}_${gridY}`;
  }

  getMarkersInRadius(x: number, y: number, radius: number): MapMarker[] {
    const candidates: MapMarker[] = [];
    const gridRadius = Math.ceil(radius / this.gridSize);
    const centerGridX = Math.floor(x / this.gridSize);
    const centerGridY = Math.floor(y / this.gridSize);

    // Check surrounding grid cells
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        const key = `${centerGridX + dx}_${centerGridY + dy}`;
        const markers = this.index[key];
        if (markers) {
          candidates.push(...markers);
        }
      }
    }

    // Filter by actual distance
    return candidates.filter(marker => {
      const dx = marker.x - x;
      const dy = marker.y - y;
      return dx * dx + dy * dy <= radius * radius;
    });
  }

  getMarkersInBounds(minX: number, minY: number, maxX: number, maxY: number): MapMarker[] {
    const markers: MapMarker[] = [];
    const minGridX = Math.floor(minX / this.gridSize);
    const minGridY = Math.floor(minY / this.gridSize);
    const maxGridX = Math.floor(maxX / this.gridSize);
    const maxGridY = Math.floor(maxY / this.gridSize);

    for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
      for (let gridY = minGridY; gridY <= maxGridY; gridY++) {
        const key = `${gridX}_${gridY}`;
        const cellMarkers = this.index[key];
        if (cellMarkers) {
          markers.push(...cellMarkers);
        }
      }
    }

    return markers;
  }

  clear(): void {
    this.index = {};
  }

  getStats(): { totalCells: number; totalMarkers: number; maxMarkersPerCell: number } {
    const cells = Object.keys(this.index);
    const totalMarkers = cells.reduce((sum, key) => sum + this.index[key].length, 0);
    const maxMarkersPerCell = Math.max(...cells.map(key => this.index[key].length), 0);

    return {
      totalCells: cells.length,
      totalMarkers,
      maxMarkersPerCell
    };
  }
}

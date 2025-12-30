import { MapMarker } from './map-marker';

export interface MinimapState {
  markers: MapMarker[];
  contextMenu: ContextMenuState;
  modals: ModalStates;
  magnifier: MagnifierState;
  markerImages: MarkerImageCache;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  target?: 'marker' | 'empty';
  marker?: MapMarker | null;
}

export interface ModalStates {
  createMarker: {
    visible: boolean;
    x: number;
    y: number;
    floor: number;
  };
  editMarker: {
    visible: boolean;
    marker: MapMarker | null;
  };
}

export interface MagnifierState {
  visible: boolean;
  x: number;
  y: number;
  mouseX: number;
  mouseY: number;
  displayX: number;
  displayY: number;
}

export interface MarkerImageCache {
  [key: string]: HTMLImageElement;
}

export interface SpatialIndex {
  [key: string]: MapMarker[];
}

export interface DirtyRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PerformanceMetrics {
  markerRenderTime: number;
  collisionDetectionTime: number;
  magnifierUpdateTime: number;
  canvasRedrawTime: number;
}

export interface MinimapProps {
  gc: any; // GameClient type
}

export interface MinimapRefs {
  canvas: React.RefObject<HTMLCanvasElement>;
  minimapCanvas: React.RefObject<any>; // Canvas class
  magnifierCanvas: React.RefObject<HTMLCanvasElement>;
  chunks: React.RefObject<any>;
  currentFloor: React.RefObject<number>;
}

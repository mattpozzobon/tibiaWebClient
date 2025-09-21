export interface MapMarker {
  id: string;
  x: number;
  y: number;
  floor: number;
  description: string;
  icon: string; // filename from data/minimap directory
  createdAt: number;
}

export const MARKER_ICONS = [
  'flag0.png',
  'flag1.png', 
  'flag12.png'
] as const;

export type MarkerIcon = typeof MARKER_ICONS[number];

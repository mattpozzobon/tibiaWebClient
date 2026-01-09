export const MINIMAP_CONFIG = {
  // Canvas configuration
  CANVAS_SIZE: 240,
  ZOOM_LEVEL: 8,
  CENTER_POINT: 120,
  
  // Magnifier configuration
  MAGNIFIER_SIZE: 120,
  MAGNIFIER_SOURCE_SIZE: 40,
  MAGNIFIER_ZOOM_FACTOR: 3,
  
  // Interaction tolerances
  CLICK_TOLERANCE: 20,
  HOVER_TOLERANCE: 20,
  MARKER_RADIUS: 16,
  
  // Spatial indexing
  SPATIAL_GRID_SIZE: 50,
  
  // Performance settings
  MAX_MARKERS_PER_GRID: 10,
  DIRTY_REGION_SIZE: 32,
  
  // Marker configuration
  MARKER_ICONS: ['flag0.png', 'flag1.png', 'flag12.png'] as const,
  
  // Database configuration
  MINIMAP_CHUNK_SIZE: 128,
} as const;

export type MarkerIcon = typeof MINIMAP_CONFIG.MARKER_ICONS[number];

// Helper function for RGB tuples - returns [R, G, B] for readability
// Format: rgb(R, G, B) where each value is 0-255
// This format allows IDE color previews in Cursor
const rgb = (r: number, g: number, b: number): [number, number, number] => {
  return [r, g, b];
};

// Colors for the minimap stored as RGB tuples [R, G, B]
// Format: rgb(R, G, B) where each value is 0-255
// This format allows IDE color previews in Cursor
export const MINIMAP_COLORS_RGB: [number, number, number][] = [
  rgb(0, 0, 0), rgb(0, 0, 51), rgb(0, 0, 102), rgb(0, 0, 153),
  rgb(0, 0, 204), rgb(0, 0, 255), rgb(0, 51, 0), rgb(0, 51, 51),
  rgb(0, 51, 102), rgb(0, 51, 153), rgb(0, 51, 204), rgb(0, 51, 255),
  rgb(0, 102, 0), rgb(0, 102, 51), rgb(0, 102, 102), rgb(130, 95, 60), //Brown Floor
  rgb(130, 95, 60), rgb(0, 102, 255), rgb(0, 153, 0), rgb(30, 188, 236),
  rgb(0, 153, 102), rgb(0, 153, 153), rgb(0, 153, 204), rgb(0, 153, 255), //1st Grass Colour
  rgb(17, 159, 17), rgb(0, 204, 51), rgb(0, 204, 102), rgb(0, 204, 153),
  rgb(0, 204, 204), rgb(0, 204, 255), rgb(0, 255, 0), rgb(0, 255, 51),
  rgb(0, 255, 102), rgb(0, 255, 153), rgb(0, 255, 204), rgb(0, 255, 255),
  rgb(51, 0, 0), rgb(51, 0, 51), rgb(51, 0, 102), rgb(51, 0, 153),
  rgb(51, 0, 204), rgb(51, 0, 255), rgb(51, 51, 0), rgb(51, 51, 51),
  rgb(51, 51, 102), rgb(51, 51, 153), rgb(51, 51, 204), rgb(51, 51, 255),
  rgb(0, 102, 204), rgb(0, 102, 255), rgb(0, 153, 0), rgb(102, 204, 255),
  rgb(0, 153, 102), rgb(0, 153, 153), rgb(0, 153, 204), rgb(0, 153, 255),
  rgb(0, 204, 0), rgb(0, 204, 51), rgb(0, 204, 102), rgb(0, 204, 153),
  rgb(0, 204, 204), rgb(0, 204, 255), rgb(0, 255, 0), rgb(0, 255, 51),
  rgb(0, 255, 102), rgb(0, 255, 153), rgb(0, 255, 204), rgb(0, 255, 255),
  rgb(51, 0, 0), rgb(51, 0, 51), rgb(51, 0, 102), rgb(51, 0, 153),
  rgb(51, 0, 204), rgb(51, 0, 255), rgb(51, 51, 0), rgb(51, 51, 51),
  rgb(51, 51, 102), rgb(51, 51, 153), rgb(51, 51, 204), rgb(51, 51, 255),
  rgb(0, 153, 204), rgb(0, 153, 255), rgb(0, 204, 0), rgb(0, 204, 51),
  rgb(0, 204, 102), rgb(0, 204, 153), rgb(0, 204, 204), rgb(0, 204, 255),
  rgb(0, 255, 0), rgb(0, 255, 51), rgb(0, 255, 102), rgb(0, 255, 153),
  rgb(0, 255, 204), rgb(0, 255, 255), rgb(51, 0, 0), rgb(51, 0, 51),
  rgb(51, 0, 102), rgb(51, 0, 153), rgb(51, 0, 204), rgb(51, 0, 255),
  rgb(51, 51, 0), rgb(51, 51, 51), rgb(51, 51, 102), rgb(51, 51, 153),
  rgb(51, 51, 204), rgb(51, 51, 255), rgb(0, 204, 204), rgb(0, 204, 255),
  rgb(0, 255, 0), rgb(0, 255, 51), rgb(0, 255, 102), rgb(0, 255, 153),
  rgb(0, 255, 204), rgb(0, 255, 255), rgb(51, 0, 0), rgb(51, 0, 51),
  rgb(51, 0, 102), rgb(51, 0, 153), rgb(51, 0, 204), rgb(51, 0, 255),
  rgb(51, 51, 0), rgb(51, 51, 51), rgb(51, 51, 102), rgb(51, 51, 153),
  rgb(51, 51, 204), rgb(51, 51, 255), rgb(51, 102, 0), rgb(51, 102, 51),
  rgb(51, 102, 102), rgb(83, 83, 83), rgb(51, 102, 204), rgb(51, 102, 255), //2nd colour floors
  rgb(51, 153, 0), rgb(51, 153, 51), rgb(51, 153, 102), rgb(51, 153, 153),
  rgb(51, 153, 204), rgb(51, 153, 255), rgb(51, 204, 0), rgb(51, 204, 51),
  rgb(51, 204, 102), rgb(51, 204, 153), rgb(51, 204, 204), rgb(51, 204, 255),
  rgb(51, 255, 0), rgb(51, 255, 51), rgb(51, 255, 102), rgb(51, 255, 153),
  rgb(51, 255, 204), rgb(51, 255, 255), rgb(102, 0, 0), rgb(102, 0, 51),
  rgb(102, 0, 102), rgb(102, 0, 153), rgb(102, 0, 204), rgb(102, 0, 255),
  rgb(102, 51, 0), rgb(102, 51, 51), rgb(102, 51, 102), rgb(102, 51, 153),
  rgb(102, 51, 204), rgb(102, 51, 255), rgb(102, 102, 0), rgb(102, 102, 51),
  rgb(102, 102, 102), rgb(102, 102, 153), rgb(102, 102, 204), rgb(102, 102, 255),
  rgb(102, 153, 0), rgb(102, 153, 51), rgb(102, 153, 102), rgb(102, 153, 153),
  rgb(102, 153, 204), rgb(102, 153, 255), rgb(102, 204, 0), rgb(102, 204, 51),
  rgb(102, 204, 102), rgb(102, 204, 153), rgb(102, 204, 204), rgb(102, 204, 255),
  rgb(102, 255, 0), rgb(102, 255, 51), rgb(102, 255, 102), rgb(102, 255, 153),
  rgb(102, 255, 204), rgb(102, 255, 255), rgb(62, 32, 1), rgb(153, 0, 51), //Walls 3rd color
  rgb(153, 0, 102), rgb(153, 0, 153), rgb(153, 0, 204), rgb(153, 0, 255),
  rgb(153, 51, 0), rgb(153, 51, 51), rgb(153, 51, 102), rgb(153, 51, 153),
  rgb(153, 51, 204), rgb(153, 51, 255), rgb(153, 102, 0), rgb(153, 102, 51),
  rgb(153, 102, 102), rgb(153, 102, 153), rgb(153, 102, 204), rgb(153, 102, 255),
  rgb(153, 153, 0), rgb(153, 153, 51), rgb(153, 153, 102), rgb(153, 153, 153),
  rgb(153, 153, 204), rgb(153, 153, 255), rgb(251, 255, 0), rgb(153, 204, 51), //3rd colour stairs, holes, teleport
  rgb(153, 204, 102), rgb(153, 204, 153), rgb(153, 204, 204), rgb(153, 204, 255),
  rgb(153, 255, 0), rgb(153, 255, 51), rgb(153, 255, 102), rgb(153, 255, 153),
  rgb(153, 255, 204), rgb(153, 255, 255), rgb(204, 0, 0), rgb(204, 0, 51),
  rgb(204, 0, 102), rgb(204, 0, 153), rgb(204, 0, 204), rgb(204, 0, 255),
  rgb(204, 51, 0), rgb(204, 51, 51), rgb(204, 51, 102), rgb(204, 51, 153),
  rgb(204, 51, 204), rgb(204, 51, 255), rgb(204, 102, 0), rgb(204, 102, 51),
  rgb(204, 102, 102), rgb(204, 102, 153), rgb(204, 102, 204), rgb(204, 102, 255),
  rgb(204, 153, 0), rgb(204, 153, 51), rgb(204, 153, 102), rgb(204, 153, 153),
  rgb(204, 153, 204), rgb(204, 153, 255), rgb(204, 204, 0), rgb(204, 204, 51),
  rgb(204, 204, 102), rgb(204, 204, 153), rgb(204, 204, 204), rgb(204, 204, 255),
  rgb(204, 255, 0), rgb(204, 255, 51), rgb(204, 255, 102), rgb(204, 255, 153),
  rgb(204, 255, 204), rgb(204, 255, 255), rgb(255, 0, 0), rgb(255, 0, 51),
  rgb(255, 0, 102), rgb(255, 0, 153), rgb(255, 0, 204), rgb(255, 0, 255),
  rgb(255, 51, 0), rgb(255, 51, 51), rgb(255, 51, 102), rgb(255, 51, 153),
  rgb(255, 51, 204), rgb(255, 51, 255), rgb(255, 102, 0), rgb(255, 102, 51),
  rgb(255, 102, 102), rgb(255, 102, 153), rgb(255, 102, 204), rgb(255, 102, 255),
  rgb(255, 153, 0), rgb(255, 153, 51), rgb(255, 153, 102), rgb(255, 153, 153),
  rgb(255, 153, 204), rgb(255, 153, 255), rgb(255, 204, 0), rgb(255, 204, 51),
  rgb(255, 204, 102), rgb(255, 204, 153), rgb(255, 204, 204), rgb(255, 204, 255),
  rgb(255, 255, 0), rgb(255, 255, 51), rgb(255, 255, 102), rgb(255, 255, 153),
  rgb(255, 255, 204), rgb(255, 255, 255), rgb(0, 0, 0), rgb(0, 0, 0),
  rgb(0, 0, 0), rgb(0, 0, 0), rgb(0, 0, 0), rgb(0, 0, 0),
  rgb(0, 0, 0), rgb(0, 0, 0),
];

// Export RGB tuples directly
export const MINIMAP_COLORS: [number, number, number][] = MINIMAP_COLORS_RGB;

// Performance monitoring labels
export const PERFORMANCE_LABELS = {
  MARKER_RENDER: 'marker-render',
  COLLISION_DETECTION: 'collision-detection',
  MAGNIFIER_UPDATE: 'magnifier-update',
  CANVAS_REDRAW: 'canvas-redraw',
  IMAGE_LOADING: 'image-loading',
} as const;

import { useState, useCallback, useRef, useEffect } from 'react';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';

const ALLOWED_ZOOM_LEVELS = [5, 7, 9] as const;

export function useMinimapZoom() {
  const minZoom = ALLOWED_ZOOM_LEVELS[0];
  const maxZoom = ALLOWED_ZOOM_LEVELS[ALLOWED_ZOOM_LEVELS.length - 1];
  
  // Initialize to closest allowed zoom level from config, or default to 7
  const initialZoom = ALLOWED_ZOOM_LEVELS.reduce((prev, curr) => 
    Math.abs(curr - MINIMAP_CONFIG.ZOOM_LEVEL) < Math.abs(prev - MINIMAP_CONFIG.ZOOM_LEVEL) ? curr : prev
  );
  
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const getNextZoomLevel = useCallback((current: number, direction: 'in' | 'out'): number => {
    const currentIndex = ALLOWED_ZOOM_LEVELS.findIndex(level => level === current);
    if (currentIndex === -1) {
      // If current zoom is not in allowed levels, find the closest one
      const closest = ALLOWED_ZOOM_LEVELS.reduce((prev, curr) => 
        Math.abs(curr - current) < Math.abs(prev - current) ? curr : prev
      );
      return closest;
    }
    
    if (direction === 'in') {
      return currentIndex < ALLOWED_ZOOM_LEVELS.length - 1 
        ? ALLOWED_ZOOM_LEVELS[currentIndex + 1]
        : current;
    } else {
      return currentIndex > 0 
        ? ALLOWED_ZOOM_LEVELS[currentIndex - 1]
        : current;
    }
  }, []);
  
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => getNextZoomLevel(prev, 'in'));
  }, [getNextZoomLevel]);
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => getNextZoomLevel(prev, 'out'));
  }, [getNextZoomLevel]);
  
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? 'out' : 'in';
    setZoomLevel(prev => getNextZoomLevel(prev, direction));
  }, [getNextZoomLevel]);
  
  useEffect(() => {
    return () => {
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }
    };
  }, []);
  
  return {
    zoomLevel,
    setZoomLevel,
    minZoom,
    maxZoom,
    handleZoomIn,
    handleZoomOut,
    handleWheel,
    zoomDebounceRef
  };
}

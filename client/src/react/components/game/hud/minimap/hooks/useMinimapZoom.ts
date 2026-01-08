import { useState, useCallback, useRef, useEffect } from 'react';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';

export function useMinimapZoom() {
  const baseZoom = MINIMAP_CONFIG.ZOOM_LEVEL;
  const maxZoom = baseZoom + 4;
  const minZoom = Math.max(0.5, baseZoom - 6);
  const zoomStep = 0.5;
  
  const [zoomLevel, setZoomLevel] = useState<number>(MINIMAP_CONFIG.ZOOM_LEVEL);
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + zoomStep, maxZoom);
      return Math.round(newZoom * 2) / 2;
    });
  }, [maxZoom, zoomStep]);
  
  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - zoomStep, minZoom);
      return Math.round(newZoom * 2) / 2;
    });
  }, [minZoom, zoomStep]);
  
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    setZoomLevel(prev => {
      const newZoom = Math.max(minZoom, Math.min(maxZoom, prev + delta));
      return Math.round(newZoom * 2) / 2;
    });
  }, [minZoom, maxZoom, zoomStep]);
  
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
    zoomStep,
    handleZoomIn,
    handleZoomOut,
    handleWheel,
    zoomDebounceRef
  };
}

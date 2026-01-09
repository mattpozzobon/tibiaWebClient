import React from 'react';

interface MinimapZoomControlsProps {
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

// Map actual zoom levels to display values
// 5 → 3, 7 → 2, 9 → 1
const getZoomDisplayValue = (zoomLevel: number): number => {
  const zoomMap: { [key: number]: number } = {
    5: 3,
    7: 2,
    9: 1
  };
  return zoomMap[zoomLevel] ?? zoomLevel;
};

export default function MinimapZoomControls({
  zoomLevel,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut
}: MinimapZoomControlsProps) {
  return (
    <div className="minimap-zoom-controls">
      <button 
        className="zoom-button zoom-in" 
        onClick={onZoomIn} 
        disabled={zoomLevel >= maxZoom} 
        title="Zoom In"
      >
        +
      </button>
      <span className="zoom-level-display">{getZoomDisplayValue(zoomLevel)}</span>
      <button 
        className="zoom-button zoom-out" 
        onClick={onZoomOut} 
        disabled={zoomLevel <= minZoom} 
        title="Zoom Out"
      >
        −
      </button>
    </div>
  );
}

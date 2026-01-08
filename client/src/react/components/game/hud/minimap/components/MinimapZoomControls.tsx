import React from 'react';

interface MinimapZoomControlsProps {
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

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
      <span className="zoom-level-display">{zoomLevel.toFixed(1)}</span>
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

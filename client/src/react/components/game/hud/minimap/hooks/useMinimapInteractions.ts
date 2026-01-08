import { useRef, useCallback } from 'react';
import { MapMarker } from '../../../../../../types/map-marker';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';
import { finalCanvasToTile, worldTileCenterToFinal, finalCanvasToWorld } from '../utils/coordinateTransformations';
import { computeZoomWindow } from '../utils/coordinateTransformations';
import type Player from '../../../../../../game/player/player';
import Position from '../../../../../../game/position';

export function useMinimapInteractions(
  player: Player | null,
  markers: MapMarker[],
  markerImages: { [key: string]: HTMLImageElement },
  currentFloorRef: React.MutableRefObject<number>,
  zoomLevel: number,
  canvasSize: number,
  getActiveViewCenter: () => Position,
  getQuantizedCenter: () => Position,
  setViewCenter: (x: number, y: number, z?: number) => void,
  setIsFollowingPlayer: (following: boolean) => void,
  setContextMenu: (menu: { visible: boolean; x: number; y: number }) => void,
  setCreateMarkerModal: (modal: { visible: boolean; x: number; y: number; floor: number }) => void,
  setEditMarkerModal: (modal: { visible: boolean; marker: MapMarker | null }) => void,
  setHoveredMarker: (marker: MapMarker | null) => void,
  setMagnifier: (magnifier: { visible: boolean; x: number; y: number; mouseX: number; mouseY: number; displayX: number; displayY: number }) => void,
  render: (chunks: any, force?: boolean) => void,
  chunksRef: React.MutableRefObject<any>
) {
  const isPanningRef = useRef(false);
  const panStartClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartViewRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const skipNextClickRef = useRef(false);
  
  const getCanvasCoords = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;
    return { x: rawX * scaleX, y: rawY * scaleY, rect };
  }, [canvasSize]);
  
  const handleCanvasRightClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!player) return;
    
    const { x, y } = getCanvasCoords(event);
    const center = getQuantizedCenter();
    const zoomWindow = computeZoomWindow(zoomLevel, canvasSize);
    const { tileX, tileY } = finalCanvasToTile(x, y, center, zoomWindow, zoomLevel, canvasSize);
    
    const clickedByTile = markers.find(m =>
      Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current
    );
    const clicked = clickedByTile || markers.find(m => {
      const { cx, cy } = worldTileCenterToFinal(m.x, m.y, center, zoomWindow, zoomLevel, canvasSize);
      const dx = x - cx;
      const dy = y - cy;
      const img = markerImages[m.icon];
      if (img && img.complete && img.naturalWidth > 0) {
        const halfW = img.naturalWidth / 2;
        const halfH = img.naturalHeight / 2;
        return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
      }
      const tol = MINIMAP_CONFIG.CLICK_TOLERANCE;
      return (dx * dx + dy * dy) <= tol * tol;
    });
    
    if (clicked) {
      setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
      setEditMarkerModal({ visible: false, marker: clicked });
    } else {
      const existingMarker = markers.find(m => Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current);
      if (existingMarker) {
        setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
        setEditMarkerModal({ visible: false, marker: existingMarker });
      } else {
        setCreateMarkerModal({ visible: false, x: tileX, y: tileY, floor: currentFloorRef.current });
        setEditMarkerModal({ visible: false, marker: null });
        setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
      }
    }
  }, [player, markers, markerImages, getCanvasCoords, getQuantizedCenter, zoomLevel, canvasSize, currentFloorRef, setContextMenu, setCreateMarkerModal, setEditMarkerModal]);
  
  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y, rect } = getCanvasCoords(event);
    
    const magnifierSize = MINIMAP_CONFIG.MAGNIFIER_SIZE;
    const gap = 10;
    const canvasEl = event.currentTarget as HTMLCanvasElement;
    const inRightColumn = !!(canvasEl.closest && canvasEl.closest('.window-column-right'));
    const inLeftColumn = !!(canvasEl.closest && canvasEl.closest('.window-column-left'));
    let displayX = inRightColumn
      ? rect.left - magnifierSize - gap
      : rect.right + gap;
    if (!inRightColumn && !inLeftColumn) {
      displayX = event.clientX + gap;
    }
    let displayY = rect.top + (rect.height / 2) - (magnifierSize / 2);
    displayY = Math.max(10, Math.min(displayY, window.innerHeight - magnifierSize - 10));
    displayX = Math.max(10, Math.min(displayX, window.innerWidth - magnifierSize - 10));
    
    setMagnifier({ visible: true, x, y, mouseX: event.clientX, mouseY: event.clientY, displayX, displayY });
    
    if (!player) { setHoveredMarker(null); return; }
    
    const center = getQuantizedCenter();
    const zoomWindow = computeZoomWindow(zoomLevel, canvasSize);
    const { tileX, tileY } = finalCanvasToTile(x, y, center, zoomWindow, zoomLevel, canvasSize);
    
    let over: MapMarker | null = null;
    const hoverByTile = markers.find(m =>
      Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current
    );
    if (hoverByTile) {
      over = hoverByTile;
    } else {
      for (const m of markers) {
        const { cx, cy } = worldTileCenterToFinal(m.x, m.y, center, zoomWindow, zoomLevel, canvasSize);
        const dx = x - cx;
        const dy = y - cy;
        const img = markerImages[m.icon];
        if (img && img.complete && img.naturalWidth > 0) {
          const halfW = img.naturalWidth / 2;
          const halfH = img.naturalHeight / 2;
          if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) { over = m; break; }
        } else {
          const tol = MINIMAP_CONFIG.HOVER_TOLERANCE;
          if (dx * dx + dy * dy <= tol * tol) { over = m; break; }
        }
      }
    }
    setHoveredMarker(over);
  }, [player, markers, markerImages, getCanvasCoords, getQuantizedCenter, zoomLevel, canvasSize, currentFloorRef, setHoveredMarker, setMagnifier]);
  
  const handleCanvasMouseLeave = useCallback(() => {
    setMagnifier({ visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 });
    setHoveredMarker(null);
    isPanningRef.current = false;
  }, [setMagnifier, setHoveredMarker]);
  
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    isPanningRef.current = true;
    panStartClientRef.current = { x: event.clientX, y: event.clientY };
    const c = getActiveViewCenter();
    panStartViewRef.current = { x: c.x, y: c.y, z: c.z };
    skipNextClickRef.current = false;
  }, [getActiveViewCenter]);
  
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);
  
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (skipNextClickRef.current) { skipNextClickRef.current = false; return; }
    if (!player || !markers.length) return;
    
    const { x, y } = getCanvasCoords(event);
    const center = getQuantizedCenter();
    const zoomWindow = computeZoomWindow(zoomLevel, canvasSize);
    const { tileX, tileY } = finalCanvasToTile(x, y, center, zoomWindow, zoomLevel, canvasSize);
    
    const clickedByTile = markers.find(m =>
      Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current
    );
    if (clickedByTile) {
      setEditMarkerModal({ visible: true, marker: clickedByTile });
      return;
    }
    
    for (const m of markers) {
      const { cx, cy } = worldTileCenterToFinal(m.x, m.y, center, zoomWindow, zoomLevel, canvasSize);
      const dx = x - cx;
      const dy = y - cy;
      const img = markerImages[m.icon];
      if (img && img.complete && img.naturalWidth > 0) {
        const halfW = img.naturalWidth / 2;
        const halfH = img.naturalHeight / 2;
        if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) { setEditMarkerModal({ visible: true, marker: m }); return; }
      } else {
        const tol = MINIMAP_CONFIG.CLICK_TOLERANCE;
        if (dx * dx + dy * dy <= tol * tol) { setEditMarkerModal({ visible: true, marker: m }); return; }
      }
    }
  }, [player, markers, markerImages, getCanvasCoords, getQuantizedCenter, zoomLevel, canvasSize, currentFloorRef, setEditMarkerModal]);
  
  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(event);
    const center = getQuantizedCenter();
    const zoomWindow = computeZoomWindow(zoomLevel, canvasSize);
    const { worldX, worldY } = finalCanvasToWorld(x, y, center, zoomWindow, zoomLevel, canvasSize);
    setViewCenter(worldX, worldY, currentFloorRef.current);
    setIsFollowingPlayer(false);
    if (chunksRef.current) render(chunksRef.current, true);
  }, [getCanvasCoords, getQuantizedCenter, zoomLevel, canvasSize, currentFloorRef, setViewCenter, setIsFollowingPlayer, render, chunksRef]);
  
  return {
    isPanningRef,
    panStartClientRef,
    panStartViewRef,
    skipNextClickRef,
    handleCanvasRightClick,
    handleCanvasMouseMove,
    handleCanvasMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleCanvasClick,
    handleDoubleClick
  };
}

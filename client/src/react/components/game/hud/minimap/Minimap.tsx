import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type GameClient from '../../../../../core/gameclient';
import Canvas from '../../../../../renderer/canvas';
import { usePlayer } from '../../../../hooks/usePlayerAttribute';
import { MapMarker } from '../../../../../types/map-marker';
import ContextMenu from '../ContextMenu';
import CreateMarkerModal from '../../modals/CreateMarkerModal';
import EditMarkerModal from '../../modals/EditMarkerModal';
import { MinimapErrorBoundary } from '../MinimapErrorBoundary';
import MinimapCanvas from './components/MinimapCanvas';
import MinimapZoomControls from './components/MinimapZoomControls';
import { useMinimapZoom } from './hooks/useMinimapZoom';
import { useMinimapView } from './hooks/useMinimapView';
import { useMinimapMarkers } from './hooks/useMinimapMarkers';
import { useMinimapRendering } from './hooks/useMinimapRendering';
import { useMinimapChunks } from './hooks/useMinimapChunks';
import { useMinimapCache } from './hooks/useMinimapCache';
import { useMinimapMagnifier } from './hooks/useMinimapMagnifier';
import { useMinimapInteractions } from './hooks/useMinimapInteractions';
import './styles/Minimap.scss';

const CANVAS_SIZE = 240;
const ZOOM_DEBOUNCE_MS = 16;
const INITIAL_CACHE_DELAY_MS = 100;

interface MinimapProps {
  gc: GameClient;
}

export default function Minimap({ gc }: MinimapProps) {
  const player = usePlayer(gc);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { zoomLevel, minZoom, maxZoom, handleZoomIn, handleZoomOut, handleWheel, zoomDebounceRef } = useMinimapZoom();
  const {
    viewCenterRef,
    currentFloorRef,
    isFollowingPlayer,
    setIsFollowingPlayer,
    viewCenterVersion,
    renderLayer,
    setRenderLayer,
    getActiveViewCenter,
    getQuantizedCenter,
    setViewCenter
  } = useMinimapView(player);
  
  const { markers, markerImages, loadMarkers } = useMinimapMarkers(gc, renderLayer);
  const { updateChunks, flushSaves } = useMinimapChunks(gc, player);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [createMarkerModal, setCreateMarkerModal] = useState<{ visible: boolean; x: number; y: number; floor: number }>({ visible: false, x: 0, y: 0, floor: 0 });
  const [editMarkerModal, setEditMarkerModal] = useState<{ visible: boolean; marker: MapMarker | null }>({ visible: false, marker: null });
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number; z: number } | null>(null);
  
  const { magnifier, setMagnifier, magnifierCanvasRef } = useMinimapMagnifier(canvasRef, CANVAS_SIZE);
  
  const { minimapCanvasRef, chunksRef, prevCenterRef, render } = useMinimapRendering(
    player,
    markers,
    markerImages,
    zoomLevel,
    CANVAS_SIZE,
    renderLayer,
    getQuantizedCenter,
    canvasRef
  );
  
  const chunkUpdateRenderTimeoutRef = useRef<number | null>(null);
  
  const chunkUpdate = useCallback((chunks: any) => {
    chunksRef.current = chunks;
    // Update chunks first (modifies ImageData in place)
    updateChunks(chunks);
    
    // Debounce render to batch multiple rapid chunk updates (e.g., when CHUNK packets arrive)
    // This prevents flickering by ensuring we only render once after all updates settle
    if (chunkUpdateRenderTimeoutRef.current !== null) {
      cancelAnimationFrame(chunkUpdateRenderTimeoutRef.current);
    }
    
      chunkUpdateRenderTimeoutRef.current = requestAnimationFrame(() => {
        chunkUpdateRenderTimeoutRef.current = null;
        // Use latest chunks from ref in case they've been updated
        const latestChunks = chunksRef.current;
        // Optimized: check if chunks object has keys without Object.keys()
        let hasChunks = false;
        for (const _ in latestChunks) {
          hasChunks = true;
          break;
        }
        if (hasChunks) {
          render(latestChunks, true);
        }
      });
  }, [updateChunks, render, chunksRef]);
  
  const { cache, schedulePanCache, debouncedCache, cacheTimeoutRef } = useMinimapCache(
    gc,
    CANVAS_SIZE,
    getQuantizedCenter,
    chunkUpdate
  );
  
  const {
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
  } = useMinimapInteractions(
    player,
    markers,
    markerImages,
    currentFloorRef,
    zoomLevel,
    CANVAS_SIZE,
    getActiveViewCenter,
    getQuantizedCenter,
    setViewCenter,
    setIsFollowingPlayer,
    setContextMenu,
    setCreateMarkerModal,
    setEditMarkerModal,
    setHoveredMarker,
    setHoveredTile,
    setMagnifier,
    render,
    chunksRef
  );
  
  useEffect(() => {
    try {
      minimapCanvasRef.current = new Canvas(null, CANVAS_SIZE, CANVAS_SIZE);
      setIsInitialized(true);
    } catch {
      setIsInitialized(false);
    }
  }, []);
  
  useEffect(() => {
    if (player && isInitialized) {
      const p = player.getPosition();
      setRenderLayer(p.z);
      currentFloorRef.current = p.z;
      prevCenterRef.current = null;
      if (isFollowingPlayer || !viewCenterRef.current) {
        setViewCenter(p.x, p.y, p.z);
      }
      const initialLoad = () => cache();
      initialLoad();
      const t = setTimeout(initialLoad, INITIAL_CACHE_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [player, isInitialized, cache, isFollowingPlayer, setViewCenter, setRenderLayer, currentFloorRef, prevCenterRef, viewCenterRef]);
  
  useEffect(() => {
    if (player && isInitialized && gc.world && gc.database) {
      const force = () => {
        const c = getQuantizedCenter();
        gc.database.cleanupDistantMinimapChunks(c);
        cache();
      };
      force();
      setTimeout(force, 50);
      setTimeout(force, 200);
    }
  }, [player, isInitialized, gc.world, gc.database, cache, getQuantizedCenter]);
  
  useEffect(() => {
    if (!player || !isInitialized) return;
    
    const handlePlayerMove = () => {
      if (!player) return;
      const p = player.getPosition();
      
      if (currentFloorRef.current !== p.z) {
        setRenderLayer(p.z);
        currentFloorRef.current = p.z;
        chunksRef.current = {};
        prevCenterRef.current = null;
        gc.database.saveMinimapChunksForCurrentLevel();
      }
      
      if (isFollowingPlayer) setViewCenter(p.x, p.y, p.z);
      
      const focus = isFollowingPlayer ? p : getQuantizedCenter();
      gc.database.cleanupDistantMinimapChunks(focus);
      cache();
    };
    
    const handleCreatureMove = (e: CustomEvent) => {
      if (e.detail.id === player?.id) {
        setIsFollowingPlayer(true);
        handlePlayerMove();
      }
    };
    const handleServerMove = (e: CustomEvent) => {
      if (e.detail.id === player?.id) {
        setIsFollowingPlayer(true);
        handlePlayerMove();
      }
    };
    
    window.addEventListener('creatureMove', handleCreatureMove as EventListener);
    window.addEventListener('creatureServerMove', handleServerMove as EventListener);
    
    const handleGlobalMouseUp = () => {
      isPanningRef.current = false;
    };
    const handleGlobalMouseMove = (ev: MouseEvent) => {
      if (!isPanningRef.current) return;
      const { x: sx, y: sy } = panStartClientRef.current;
      const start = panStartViewRef.current!;
      const dxPx = ev.clientX - sx;
      const dyPx = ev.clientY - sy;
      const worldDx = dxPx / zoomLevel;
      const worldDy = dyPx / zoomLevel;
      setIsFollowingPlayer(false);
      setViewCenter(start.x - worldDx, start.y - worldDy, start.z);
      skipNextClickRef.current = Math.hypot(dxPx, dyPx) > 3;
      if (chunksRef.current) render(chunksRef.current, true);
      schedulePanCache();
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('creatureMove', handleCreatureMove as EventListener);
      window.removeEventListener('creatureServerMove', handleServerMove as EventListener);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [player, isInitialized, cache, gc.database, isFollowingPlayer, getQuantizedCenter, setViewCenter, zoomLevel, render, schedulePanCache, setIsFollowingPlayer, setRenderLayer, currentFloorRef, chunksRef, prevCenterRef, isPanningRef, panStartClientRef, panStartViewRef, skipNextClickRef]);
  
  useEffect(() => {
    if (!player || !isInitialized) return;
    return () => {
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
      if (chunkUpdateRenderTimeoutRef.current !== null) {
        cancelAnimationFrame(chunkUpdateRenderTimeoutRef.current);
      }
      // Flush any pending chunk saves before saving all
      flushSaves();
      gc.database.saveAllMinimapChunks();
    };
  }, [player, isInitialized, gc.database, cacheTimeoutRef, flushSaves]);
  
  useEffect(() => {
    if (chunksRef.current) {
      render(chunksRef.current, true);
      debouncedCache();
    }
  }, [viewCenterVersion, render, debouncedCache, chunksRef]);
  
  useEffect(() => {
    if (chunksRef.current) {
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }
      zoomDebounceRef.current = setTimeout(() => {
        if (chunksRef.current) {
          render(chunksRef.current, true);
        }
        zoomDebounceRef.current = null;
      }, ZOOM_DEBOUNCE_MS);
    }
    return () => {
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
      }
    };
  }, [zoomLevel, render, chunksRef, zoomDebounceRef]);
  
  const handleCreateMarker = useCallback(async (data: Omit<MapMarker, 'id' | 'createdAt'>) => {
    if (!gc.database) return;
    try {
      await gc.database.saveMapMarker(data);
      await loadMarkers();
    } catch (error) {
      console.error('Failed to create marker:', error);
    }
  }, [gc.database, loadMarkers]);
  
  const handleUpdateMarker = useCallback(async (m: MapMarker) => {
    if (!gc.database) return;
    try {
      await gc.database.updateMapMarker(m);
      await loadMarkers();
    } catch (error) {
      console.error('Failed to update marker:', error);
    }
  }, [gc.database, loadMarkers]);
  
  const handleDeleteMarker = useCallback(async (id: string) => {
    if (!gc.database) return;
    try {
      await gc.database.deleteMapMarker(id);
      await loadMarkers();
    } catch (error) {
      console.error('Failed to delete marker:', error);
    }
  }, [gc.database, loadMarkers]);
  
  if (!player || !isInitialized) return null;
  
  return (
    <MinimapErrorBoundary>
      <div className="minimap-container">
        <MinimapCanvas
          ref={canvasRef}
          canvasSize={CANVAS_SIZE}
          onContextMenu={handleCanvasRightClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        />
        
        <MinimapZoomControls
          zoomLevel={zoomLevel}
          minZoom={minZoom}
          maxZoom={maxZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>
      
      {createPortal(
        <ContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          items={editMarkerModal.marker ? [
            { label: 'Edit Marker', onClick: () => setEditMarkerModal(prev => ({ ...prev, visible: true })) },
            { label: 'Delete Marker', onClick: async () => {
                const m = editMarkerModal.marker;
                if (!m || !gc.database) return;
                try {
                  await gc.database.deleteMapMarker(m.id);
                  await loadMarkers();
                } catch (error) {
                  console.error('Failed to delete marker:', error);
                }
              }, className: 'delete' }
          ] : [
            { label: 'Create Marker', onClick: () => setCreateMarkerModal(prev => ({ ...prev, visible: true })) }
          ]}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        />,
        document.body
      )}
      
      {createPortal(
        <CreateMarkerModal
          visible={createMarkerModal.visible}
          x={createMarkerModal.x}
          y={createMarkerModal.y}
          floor={createMarkerModal.floor}
          onClose={() => setCreateMarkerModal({ visible: false, x: 0, y: 0, floor: 0 })}
          onCreate={handleCreateMarker}
        />,
        document.body
      )}
      
      {createPortal(
        <EditMarkerModal
          visible={editMarkerModal.visible}
          marker={editMarkerModal.marker}
          onClose={() => setEditMarkerModal({ visible: false, marker: null })}
          onUpdate={handleUpdateMarker}
          onDelete={handleDeleteMarker}
        />,
        document.body
      )}
      
      {createPortal(
        magnifier.visible && (
          <div 
            className="minimap-magnifier" 
            style={{ left: magnifier.displayX, top: magnifier.displayY }}
            data-minimap-portal="magnifier"
          >
            <canvas ref={magnifierCanvasRef} />
          </div>
        ),
        document.body
      )}
      
      {createPortal(
        hoveredMarker && hoveredMarker.description && hoveredMarker.description.trim() && magnifier.visible && (
          <div 
            className="marker-tooltip marker-tooltip-portal"
            style={{ 
              left: magnifier.displayX,
              top: magnifier.displayY
            }}
            data-minimap-portal="tooltip"
          >
            {hoveredMarker.description}
          </div>
        ),
        document.body
      )}

      {createPortal(
        hoveredTile && magnifier.visible && (
          <div 
            className="position-tooltip position-tooltip-portal"
            style={{ 
              left: magnifier.mouseX + 15,
              top: magnifier.mouseY + 15
            }}
            data-minimap-portal="position-tooltip"
          >
            {hoveredTile.x}, {hoveredTile.y}, {hoveredTile.z}
          </div>
        ),
        document.body
      )}
    </MinimapErrorBoundary>
  );
}

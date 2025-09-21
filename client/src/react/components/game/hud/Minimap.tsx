import React, { useState, useEffect, useRef, useCallback } from 'react';
import type GameClient from '../../../../core/gameclient';
import Position from '../../../../game/position';
import Canvas from '../../../../renderer/canvas';
import { usePlayer } from '../../../hooks/usePlayerAttribute';
import { MapMarker } from '../../../../types/map-marker';
import { MINIMAP_CONFIG, PERFORMANCE_LABELS, MINIMAP_COLORS_EARTHY } from '../../../../config/minimap-config';
import { PerformanceMonitor } from '../../../../utils/performance-monitor';
import { ImageLoader } from '../../../../utils/image-loader';
import { MarkerSpatialIndex } from '../../../../utils/spatial-index';
import { MemoryManager } from '../../../../utils/memory-manager';
import ContextMenu from './ContextMenu';
import CreateMarkerModal from '../modals/CreateMarkerModal';
import EditMarkerModal from '../modals/EditMarkerModal';
import { MinimapErrorBoundary } from './MinimapErrorBoundary';
import './styles/Minimap.scss';

interface MinimapProps {
  gc: GameClient;
}


export default function Minimap({ gc }: MinimapProps) {
  const player = usePlayer(gc);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<Canvas | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const chunksRef = useRef<any>({});
  const currentFloorRef = useRef<number>(0);
  const spatialIndexRef = useRef<MarkerSpatialIndex>(new MarkerSpatialIndex());

  // State
  const [renderLayer, setRenderLayer] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Marker-related state
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [createMarkerModal, setCreateMarkerModal] = useState<{ visible: boolean; x: number; y: number; floor: number }>({ visible: false, x: 0, y: 0, floor: 0 });
  const [editMarkerModal, setEditMarkerModal] = useState<{ visible: boolean; marker: MapMarker | null }>({ visible: false, marker: null });
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);
  
  // Image cache for marker icons
  const [markerImages, setMarkerImages] = useState<{ [key: string]: HTMLImageElement }>({});
  
  // Zoom magnifier state
  const [magnifier, setMagnifier] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    mouseX: number; 
    mouseY: number;
    displayX: number;
    displayY: number;
  }>({ visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 });

  useEffect(() => {
    if (!minimapCanvasRef.current) {
      try {
        minimapCanvasRef.current = new Canvas(null, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize minimap canvas:', error);
        setIsInitialized(false);
      }
    }
  }, []);

  // Preload marker images using optimized ImageLoader
  useEffect(() => {
    const loadMarkerImages = async () => {
      PerformanceMonitor.start(PERFORMANCE_LABELS.IMAGE_LOADING);
      try {
        const imageMap = await ImageLoader.preloadMarkerImages();
        setMarkerImages(Object.fromEntries(imageMap));
        PerformanceMonitor.end(PERFORMANCE_LABELS.IMAGE_LOADING);
      } catch (error) {
        console.error('Failed to load marker images:', error);
        PerformanceMonitor.end(PERFORMANCE_LABELS.IMAGE_LOADING);
      }
    };

    loadMarkerImages();
  }, []);

  const getTileColor = useCallback((tile: any) => {
    const itemColors = tile.items
      .map((item: any) => item.getMinimapColor())
      .filter((x: any) => x !== null);
    
    if (itemColors.length > 0) {
      return itemColors[itemColors.length - 1];
    }
    
    return tile.getMinimapColor();
  }, []);

  const loadMarkers = useCallback(async () => {
    if (!gc.database) return;
    
    try {
      const loadedMarkers = await gc.database.getMapMarkersForFloor(renderLayer);
      setMarkers(loadedMarkers);
      // Update spatial index for optimized collision detection
      spatialIndexRef.current.updateIndex(loadedMarkers);
    } catch (error) {
      console.error('Failed to load markers:', error);
      setMarkers([]);
    }
  }, [gc.database, renderLayer]);

  const updateChunks = useCallback((chunks: any) => {
    if (!gc.world || !player || !gc.database) return;

    const currentFloor = player.getPosition().z;
    const modifiedChunks = new Set<string>();
    
    gc.world.chunks.forEach((chunk: any) => {
      const tiles = chunk.getFloorTiles(currentFloor);
      tiles.forEach((tile: any) => {
        if (tile === null) return;
        if (!player!.canSee(tile)) return;
        
        const color = getTileColor(tile);
        if (color === null) return;
        
        const chunkId = gc.database.getMinimapChunkId(tile.getPosition());
        const buffer = chunks[chunkId];
        if (!buffer) return;
        
        const index = (tile.getPosition().x % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE) + ((tile.getPosition().y % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE) * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE);
        // Use the proper color palette - color is an index into the palette
        const colorValue = color !== null ? MINIMAP_COLORS_EARTHY[color] || 0xFF000000 : 0xFF000000;
        buffer.view[index] = colorValue;
        
        // Mark chunk as modified for immediate saving
        modifiedChunks.add(chunkId);
      });
    });
    
    // Save modified chunks immediately
    modifiedChunks.forEach((chunkId: string) => {
      gc.database.saveMinimapChunk(chunkId);
    });
  }, [gc.world, player, gc.database, getTileColor]);

  const drawPlayerIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!player) return;
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(MINIMAP_CONFIG.CENTER_POINT, MINIMAP_CONFIG.CENTER_POINT, MINIMAP_CONFIG.ZOOM_LEVEL, MINIMAP_CONFIG.ZOOM_LEVEL);
  }, [player]);

  const drawMarkersOnFinalCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    PerformanceMonitor.start(PERFORMANCE_LABELS.MARKER_RENDER);
    if (!player || markers.length === 0) {
      PerformanceMonitor.end(PERFORMANCE_LABELS.MARKER_RENDER);
      return;
    }

    const currentPos = player.getPosition();
    const currentX = currentPos.x;
    const currentY = currentPos.y;
    
    // Pre-calculate zoom transformation values
    const sourceSize = MINIMAP_CONFIG.CANVAS_SIZE / MINIMAP_CONFIG.ZOOM_LEVEL;
    const sourceOffset = (MINIMAP_CONFIG.CANVAS_SIZE - sourceSize) / 2;
    
    // Pre-calculate bounds for culling
    const minX = -sourceOffset * MINIMAP_CONFIG.ZOOM_LEVEL;
    const maxX = (MINIMAP_CONFIG.CANVAS_SIZE - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
    const minY = -sourceOffset * MINIMAP_CONFIG.ZOOM_LEVEL;
    const maxY = (MINIMAP_CONFIG.CANVAS_SIZE - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;

    markers.forEach((marker) => {
      // Convert world coordinates to final canvas coordinates (optimized)
      const minimapX = marker.x - currentX + MINIMAP_CONFIG.CENTER_POINT;
      const minimapY = marker.y - currentY + MINIMAP_CONFIG.CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const finalX = (minimapX - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      const finalY = (minimapY - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;

           // Early culling - only draw markers within the visible area
           if (finalX >= minX && finalX <= maxX && finalY >= minY && finalY <= maxY) {
             // Try to draw the preloaded marker image at original size
             const image = markerImages[marker.icon];
             if (image && image.complete && image.naturalWidth > 0) {
               // Draw the marker image anchored at bottom-center (like a flag pole)
               const halfWidth = image.naturalWidth / 2;
               const fullHeight = image.naturalHeight;
               ctx.drawImage(image, finalX - halfWidth, finalY - fullHeight);
             } else {
               // Fallback to colored circle if image is not loaded - centered
               ctx.fillStyle = '#FFD700';
               ctx.beginPath();
               ctx.arc(finalX, finalY, 6, 0, 2 * Math.PI);
               ctx.fill();
               
               ctx.strokeStyle = '#000000';
               ctx.lineWidth = 1;
               ctx.stroke();
             }
           }
    });
    PerformanceMonitor.end(PERFORMANCE_LABELS.MARKER_RENDER);
  }, [player, markers, markerImages]);

  const render = useCallback((chunks: any) => {
    if (!minimapCanvasRef.current || !player) return;

    const minimap = minimapCanvasRef.current;
    minimap.clear();

    Object.keys(chunks).forEach((id: string) => {
      const chunk = chunks[id];
      if (chunk === null) return;
      
      const [x, y, z] = id.split(".").map(Number);
      if (z !== renderLayer) return;
      
      minimap.context.putImageData(
        chunk.imageData,
        x * 128 - player!.getPosition().x + MINIMAP_CONFIG.CENTER_POINT,
        y * 128 - player!.getPosition().y + MINIMAP_CONFIG.CENTER_POINT
      );
    });

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE);
        
        const sourceSize = MINIMAP_CONFIG.CANVAS_SIZE / MINIMAP_CONFIG.ZOOM_LEVEL;
        const sourceOffset = (MINIMAP_CONFIG.CANVAS_SIZE - sourceSize) / 2;
        
        ctx.drawImage(
          minimap.canvas,
          sourceOffset, sourceOffset, sourceSize, sourceSize,
          0, 0, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE
        );
        
        // Draw markers on final canvas at full size (not affected by zoom)
        drawMarkersOnFinalCanvas(ctx);
        
        drawPlayerIndicator(ctx);
      }
    }
  }, [player, renderLayer, drawPlayerIndicator, drawMarkersOnFinalCanvas]);

  const chunkUpdate = useCallback((chunks: any) => {
    chunksRef.current = chunks;
    updateChunks(chunks);
    render(chunks);
  }, [updateChunks, render]);

  const cache = useCallback(() => {
    if (!player || !gc.database || !gc.world) return;

    const position = player.getPosition();
    const currentFloor = position.z;
    const radius = MINIMAP_CONFIG.CENTER_POINT;

    const positions = [
      new Position(position.x, position.y, currentFloor),
      new Position(position.x - radius, position.y - radius, currentFloor),
      new Position(position.x, position.y - radius, currentFloor),
      new Position(position.x + radius, position.y - radius, currentFloor),
      new Position(position.x + radius, position.y, currentFloor),
      new Position(position.x + radius, position.y + radius, currentFloor),
      new Position(position.x, position.y + radius, currentFloor),
      new Position(position.x - radius, position.y + radius, currentFloor),
      new Position(position.x - radius, position.y, currentFloor)
    ];

    try {
      gc.database.preloadMinimapChunks(positions, chunkUpdate);
    } catch (error) {
      // Silent error handling
    }
  }, [player, gc.database, gc.world, chunkUpdate]);

  useEffect(() => {
    if (player && isInitialized) {
      const playerZ = player.getPosition().z;
      setRenderLayer(playerZ);
      currentFloorRef.current = playerZ;
      
      // Initial load with a small delay to ensure everything is ready
      const initialLoad = () => {
        cache();
      };
      
      // Try immediate load first
      initialLoad();
      
      // Also try after a small delay to ensure all systems are ready
      const timeout = setTimeout(initialLoad, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [player, isInitialized, cache]);

  useEffect(() => {
    if (player && isInitialized && gc.world && gc.database) {
      // Force initial minimap load when all systems are ready
      const forceInitialLoad = () => {
        const currentPosition = player.getPosition();
        gc.database.cleanupDistantMinimapChunks(currentPosition);
        cache();
      };
      
      // Try multiple times to ensure it loads
      forceInitialLoad();
      setTimeout(forceInitialLoad, 50);
      setTimeout(forceInitialLoad, 200);
    }
  }, [player, isInitialized, gc.world, gc.database, cache]);

  useEffect(() => {
    if (!player || !isInitialized) return;

    const handlePlayerMove = () => {
      if (!player || !isInitialized) return;
      
      const currentFloor = player.getPosition().z;
      const currentPosition = player.getPosition();
      
      if (currentFloorRef.current !== currentFloor) {
        setRenderLayer(currentFloor);
        currentFloorRef.current = currentFloor;
        chunksRef.current = {};
        
        gc.database.saveMinimapChunksForCurrentLevel();
      }
      
      gc.database.cleanupDistantMinimapChunks(currentPosition);
      cache();
    };

    const handleCreatureMove = (event: CustomEvent) => {
      if (event.detail.id === player?.id) {
        handlePlayerMove();
      }
    };

    const handleServerMove = (event: CustomEvent) => {
      if (event.detail.id === player?.id) {
        handlePlayerMove();
      }
    };

    window.addEventListener('creatureMove', handleCreatureMove as EventListener);
    window.addEventListener('creatureServerMove', handleServerMove as EventListener);

    return () => {
      window.removeEventListener('creatureMove', handleCreatureMove as EventListener);
      window.removeEventListener('creatureServerMove', handleServerMove as EventListener);
    };
  }, [player, isInitialized, cache]);

  useEffect(() => {
    if (!player || !isInitialized) return;

    return () => {
      // Save all chunks only on component unmount
      gc.database.saveAllMinimapChunks();
    };
  }, [player, isInitialized, gc.database]);

  const handleCanvasRightClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert canvas coordinates to world coordinates (reverse of marker rendering)
    const currentPos = player!.getPosition();
    
    // Apply the reverse transformation of the minimap rendering
    const sourceSize = MINIMAP_CONFIG.CANVAS_SIZE / MINIMAP_CONFIG.ZOOM_LEVEL;
    const sourceOffset = (MINIMAP_CONFIG.CANVAS_SIZE - sourceSize) / 2;
    
    // Convert final canvas coordinates back to minimap coordinates
    const minimapX = (x / MINIMAP_CONFIG.ZOOM_LEVEL) + sourceOffset;
    const minimapY = (y / MINIMAP_CONFIG.ZOOM_LEVEL) + sourceOffset;
    
    // Convert minimap coordinates to world coordinates
    const worldX = minimapX - MINIMAP_CONFIG.CENTER_POINT + currentPos.x;
    const worldY = minimapY - MINIMAP_CONFIG.CENTER_POINT + currentPos.y;
    
    // Check if right-clicking on an existing marker
    // Use the same coordinate transformation as rendering for accurate collision detection
    PerformanceMonitor.start(PERFORMANCE_LABELS.COLLISION_DETECTION);
    const clickedMarker = markers.find(marker => {
      // Convert marker world coordinates to final canvas coordinates (same as rendering)
      const markerMinimapX = marker.x - currentPos.x + MINIMAP_CONFIG.CENTER_POINT;
      const markerMinimapY = marker.y - currentPos.y + MINIMAP_CONFIG.CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const markerFinalX = (markerMinimapX - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      const markerFinalY = (markerMinimapY - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      
      // Check if click coordinates match marker coordinates (with tolerance)
      const clickTolerance = MINIMAP_CONFIG.CLICK_TOLERANCE; // Pixels of tolerance for clicking
      const dx = x - markerFinalX;
      const dy = y - markerFinalY;
      
      // For bottom-center anchored markers, check if click is within the marker bounds
      const image = markerImages[marker.icon];
      if (image && image.complete && image.naturalWidth > 0) {
        const halfWidth = image.naturalWidth / 2;
        const fullHeight = image.naturalHeight;
        
        // Check if click is within the marker image bounds
        const withinX = Math.abs(dx) <= halfWidth;
        const withinY = dy >= -fullHeight && dy <= 0; // Bottom-center anchored
        
        return withinX && withinY;
      } else {
        // Fallback to circular detection for non-loaded images
        return dx * dx + dy * dy <= clickTolerance * clickTolerance;
      }
    });
    PerformanceMonitor.end(PERFORMANCE_LABELS.COLLISION_DETECTION);
    
    if (clickedMarker) {
      // Right-clicked on existing marker - show edit/delete options
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY
      });
      // Store the clicked marker for context menu actions
      setEditMarkerModal({
        visible: false,
        marker: clickedMarker
      });
    } else {
      // Right-clicked on empty space - show create marker option
      setCreateMarkerModal({
        visible: false,
        x: worldX,
        y: worldY,
        floor: currentPos.z
      });
      
      // Clear any stored marker to ensure we show create option
      setEditMarkerModal({
        visible: false,
        marker: null
      });
      
      // Show context menu
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [player, markers, markerImages]);

  const handleCreateMarkerClick = useCallback(() => {
    // Open the create marker modal with the stored position
    setCreateMarkerModal(prev => ({
      ...prev,
      visible: true
    }));
  }, []);

  const handleEditMarkerClick = useCallback(() => {
    // Open the edit marker modal with the stored marker
    setEditMarkerModal(prev => ({
      ...prev,
      visible: true
    }));
  }, []);

  const handleDeleteMarkerClick = useCallback(async () => {
    const marker = editMarkerModal.marker;
    if (!marker || !gc.database) return;
    
    if (confirm(`Are you sure you want to delete the marker "${marker.description || 'Untitled'}"?`)) {
      try {
        await gc.database.deleteMapMarker(marker.id);
        await loadMarkers(); // Reload markers
      } catch (error) {
        console.error('Failed to delete marker:', error);
        alert('Failed to delete marker');
      }
    }
  }, [editMarkerModal.marker, gc.database, loadMarkers]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!player) {
      setHoveredMarker(null);
      setMagnifier({ visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 });
      return;
    }
    
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate smart positioning for magnifier
    const magnifierSize = 120;
    const offset = 20;
    
    // Default: position to the left of mouse
    let displayX = event.clientX - magnifierSize - offset;
    let displayY = event.clientY - magnifierSize / 2;
    
    // If magnifier would go off-screen to the left, position it to the right
    if (displayX < 10) {
      displayX = event.clientX + offset;
    }
    
    // If magnifier would go off-screen to the top, adjust Y position
    if (displayY < 10) {
      displayY = 10;
    }
    
    // If magnifier would go off-screen to the bottom, adjust Y position
    if (displayY + magnifierSize > window.innerHeight - 10) {
      displayY = window.innerHeight - magnifierSize - 10;
    }
    
    // Show magnifier when mouse is over minimap
    setMagnifier({
      visible: true,
      x: x,
      y: y,
      mouseX: event.clientX,
      mouseY: event.clientY,
      displayX: displayX,
      displayY: displayY
    });
    
    // Convert canvas coordinates to world coordinates (optimized)
    const currentPos = player.getPosition();
    
    // Apply the reverse transformation of the minimap rendering
    const sourceSize = MINIMAP_CONFIG.CANVAS_SIZE / MINIMAP_CONFIG.ZOOM_LEVEL;
    const sourceOffset = (MINIMAP_CONFIG.CANVAS_SIZE - sourceSize) / 2;
    
    // Convert final canvas coordinates back to minimap coordinates
    const minimapX = (x / MINIMAP_CONFIG.ZOOM_LEVEL) + sourceOffset;
    const minimapY = (y / MINIMAP_CONFIG.ZOOM_LEVEL) + sourceOffset;
    
    // Convert minimap coordinates to world coordinates
    const worldX = minimapX - MINIMAP_CONFIG.CENTER_POINT + currentPos.x;
    const worldY = minimapY - MINIMAP_CONFIG.CENTER_POINT + currentPos.y;
    
    // Check if mouse is over a marker (optimized with early exit)
    // Use the same coordinate transformation as rendering for accurate collision detection
    let markerUnderMouse = null;
    for (const marker of markers) {
      // Convert marker world coordinates to final canvas coordinates (same as rendering)
      const markerMinimapX = marker.x - currentPos.x + MINIMAP_CONFIG.CENTER_POINT;
      const markerMinimapY = marker.y - currentPos.y + MINIMAP_CONFIG.CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const markerFinalX = (markerMinimapX - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      const markerFinalY = (markerMinimapY - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      
      // Check if mouse coordinates match marker coordinates (with tolerance)
      const hoverTolerance = MINIMAP_CONFIG.HOVER_TOLERANCE; // Pixels of tolerance for hovering
      const dx = x - markerFinalX;
      const dy = y - markerFinalY;
      
      // For bottom-center anchored markers, check if mouse is within the marker bounds
      const image = markerImages[marker.icon];
      if (image && image.complete && image.naturalWidth > 0) {
        const halfWidth = image.naturalWidth / 2;
        const fullHeight = image.naturalHeight;
        
        // Check if mouse is within the marker image bounds
        const withinX = Math.abs(dx) <= halfWidth;
        const withinY = dy >= -fullHeight && dy <= 0; // Bottom-center anchored
        
        if (withinX && withinY) {
          markerUnderMouse = marker;
          break;
        }
      } else {
        // Fallback to circular detection for non-loaded images
        if (dx * dx + dy * dy <= hoverTolerance * hoverTolerance) {
          markerUnderMouse = marker;
          break;
        }
      }
    }
    
    setHoveredMarker(markerUnderMouse);
  }, [player, markers, markerImages]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!player || markers.length === 0) return;
    
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert canvas coordinates to world coordinates
    const currentPos = player.getPosition();
    
    // Apply the reverse transformation of the minimap rendering
    const sourceSize = MINIMAP_CONFIG.CANVAS_SIZE / MINIMAP_CONFIG.ZOOM_LEVEL;
    const sourceOffset = (MINIMAP_CONFIG.CANVAS_SIZE - sourceSize) / 2;
    
    // Convert final canvas coordinates back to minimap coordinates
    const minimapX = (x / MINIMAP_CONFIG.ZOOM_LEVEL) + sourceOffset;
    const minimapY = (y / MINIMAP_CONFIG.ZOOM_LEVEL) + sourceOffset;
    
    // Convert minimap coordinates to world coordinates
    const worldX = minimapX - MINIMAP_CONFIG.CENTER_POINT + currentPos.x;
    const worldY = minimapY - MINIMAP_CONFIG.CENTER_POINT + currentPos.y;
    
    // Check if clicked on a marker (optimized with early exit)
    // Use the same coordinate transformation as rendering for accurate collision detection
    for (const marker of markers) {
      // Convert marker world coordinates to final canvas coordinates (same as rendering)
      const markerMinimapX = marker.x - currentPos.x + MINIMAP_CONFIG.CENTER_POINT;
      const markerMinimapY = marker.y - currentPos.y + MINIMAP_CONFIG.CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const markerFinalX = (markerMinimapX - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      const markerFinalY = (markerMinimapY - sourceOffset) * MINIMAP_CONFIG.ZOOM_LEVEL;
      
      // Check if click coordinates match marker coordinates (with tolerance)
      const clickTolerance = MINIMAP_CONFIG.CLICK_TOLERANCE; // Pixels of tolerance for clicking
      const dx = x - markerFinalX;
      const dy = y - markerFinalY;
      
      // For bottom-center anchored markers, check if click is within the marker bounds
      const image = markerImages[marker.icon];
      if (image && image.complete && image.naturalWidth > 0) {
        const halfWidth = image.naturalWidth / 2;
        const fullHeight = image.naturalHeight;
        
        // Check if click is within the marker image bounds
        const withinX = Math.abs(dx) <= halfWidth;
        const withinY = dy >= -fullHeight && dy <= 0; // Bottom-center anchored
        
        if (withinX && withinY) {
          setEditMarkerModal({
            visible: true,
            marker: marker
          });
          return;
        }
      } else {
        // Fallback to circular detection for non-loaded images
        if (dx * dx + dy * dy <= clickTolerance * clickTolerance) {
          setEditMarkerModal({
            visible: true,
            marker: marker
          });
          return;
        }
      }
    }
  }, [player, markers, markerImages]);

  const handleCanvasMouseLeave = useCallback(() => {
    setMagnifier({ visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 });
    setHoveredMarker(null);
  }, []);

  const updateMagnifier = useCallback(() => {
    if (!magnifier.visible || !canvasRef.current || !magnifierCanvasRef.current) return;
    
    PerformanceMonitor.start(PERFORMANCE_LABELS.MAGNIFIER_UPDATE);
    
    const mainCanvas = canvasRef.current;
    const magnifierCanvas = magnifierCanvasRef.current;
    const ctx = magnifierCanvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear the magnifier canvas
    ctx.clearRect(0, 0, MINIMAP_CONFIG.MAGNIFIER_SIZE, MINIMAP_CONFIG.MAGNIFIER_SIZE);
    
    // Calculate the source region around the mouse
    const sourceSize = MINIMAP_CONFIG.MAGNIFIER_SOURCE_SIZE;
    const sourceX = Math.max(0, Math.min(MINIMAP_CONFIG.CANVAS_SIZE - sourceSize, magnifier.x - sourceSize / 2));
    const sourceY = Math.max(0, Math.min(MINIMAP_CONFIG.CANVAS_SIZE - sourceSize, magnifier.y - sourceSize / 2));
    
    // Draw the magnified region (3x zoom) from the final display canvas
    ctx.drawImage(
      mainCanvas,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, MINIMAP_CONFIG.MAGNIFIER_SIZE, MINIMAP_CONFIG.MAGNIFIER_SIZE
    );
    
    // Draw crosshair to show exact mouse position
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Calculate crosshair position in magnifier (center of the magnifier)
    const crosshairX = MINIMAP_CONFIG.MAGNIFIER_SIZE / 2;
    const crosshairY = MINIMAP_CONFIG.MAGNIFIER_SIZE / 2;
    
    // Draw horizontal crosshair line
    ctx.beginPath();
    ctx.moveTo(0, crosshairY);
    ctx.lineTo(MINIMAP_CONFIG.MAGNIFIER_SIZE, crosshairY);
    ctx.stroke();
    
    // Draw vertical crosshair line
    ctx.beginPath();
    ctx.moveTo(crosshairX, 0);
    ctx.lineTo(crosshairX, MINIMAP_CONFIG.MAGNIFIER_SIZE);
    ctx.stroke();
    
    // Draw center dot
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(crosshairX, crosshairY, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.setLineDash([]); // Reset line dash
    PerformanceMonitor.end(PERFORMANCE_LABELS.MAGNIFIER_UPDATE);
  }, [magnifier.visible, magnifier.x, magnifier.y]);

  // Update magnifier when it becomes visible
  useEffect(() => {
    if (magnifier.visible) {
      updateMagnifier();
    }
  }, [magnifier.visible, magnifier.x, magnifier.y, updateMagnifier]);

  const handleCreateMarker = useCallback(async (markerData: Omit<MapMarker, 'id' | 'createdAt'>) => {
    if (!gc.database) return;
    
    try {
      await gc.database.saveMapMarker(markerData);
      await loadMarkers(); // Reload markers
    } catch (error) {
      console.error('Failed to create marker:', error);
      alert('Failed to create marker');
    }
  }, [gc.database, loadMarkers]);

  const handleUpdateMarker = useCallback(async (marker: MapMarker) => {
    if (!gc.database) return;
    
    try {
      await gc.database.updateMapMarker(marker);
      await loadMarkers(); // Reload markers
    } catch (error) {
      console.error('Failed to update marker:', error);
      alert('Failed to update marker');
    }
  }, [gc.database, loadMarkers]);

  const handleDeleteMarker = useCallback(async (markerId: string) => {
    if (!gc.database) return;
    
    try {
      await gc.database.deleteMapMarker(markerId);
      await loadMarkers(); // Reload markers
    } catch (error) {
      console.error('Failed to delete marker:', error);
      alert('Failed to delete marker');
    }
  }, [gc.database, loadMarkers]);

  // Load markers when floor changes
  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);

  // Memory management and cleanup
  useEffect(() => {
    // Register caches for memory management
    MemoryManager.registerCache('markerImages', new Map(Object.entries(markerImages)));
    
    // Register cleanup callback
    const cleanupCallback = () => {
      spatialIndexRef.current.clear();
      console.log('Minimap cleanup completed');
    };
    
    MemoryManager.registerCleanup(cleanupCallback);
    
    // Log performance metrics periodically
    const performanceInterval = setInterval(() => {
      PerformanceMonitor.logMetrics();
      MemoryManager.logMemoryStats();
    }, 30000); // Every 30 seconds

    return () => {
      MemoryManager.unregisterCleanup(cleanupCallback);
      clearInterval(performanceInterval);
    };
  }, [markerImages]);

  if (!player || !isInitialized) {
    return null;
  }

  return (
    <MinimapErrorBoundary>
      <div className="minimap-container">
      <div className="minimap-canvas-container">
        <canvas
          ref={canvasRef}
          width={MINIMAP_CONFIG.CANVAS_SIZE}
          height={MINIMAP_CONFIG.CANVAS_SIZE}
          className="minimap-canvas"
          onContextMenu={handleCanvasRightClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onClick={handleCanvasClick}
        />
        
        {/* Hover tooltip */}
        {hoveredMarker && (
          <div className="marker-tooltip">
            {hoveredMarker.description}
          </div>
        )}
        
        {/* Magnifier */}
        {magnifier.visible && (
          <div
            className="minimap-magnifier"
            style={{
              left: magnifier.displayX,
              top: magnifier.displayY
            }}
          >
            <canvas
              ref={magnifierCanvasRef}
              width="120"
              height="120"
            />
          </div>
        )}
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={editMarkerModal.marker ? [
          // Right-clicked on existing marker
          {
            label: 'Edit Marker',
            onClick: handleEditMarkerClick
          },
          {
            label: 'Delete Marker',
            onClick: handleDeleteMarkerClick,
            className: 'delete'
          }
        ] : [
          // Right-clicked on empty space
          {
            label: 'Create Marker',
            onClick: handleCreateMarkerClick
          }
        ]}
        onClose={() => {
          setContextMenu({ visible: false, x: 0, y: 0 });
          // Don't clear the stored marker when closing context menu
          // The marker should remain available for the EditMarkerModal
        }}
      />
      
      {/* Create Marker Modal */}
      <CreateMarkerModal
        visible={createMarkerModal.visible}
        x={createMarkerModal.x}
        y={createMarkerModal.y}
        floor={createMarkerModal.floor}
        onClose={() => setCreateMarkerModal({ visible: false, x: 0, y: 0, floor: 0 })}
        onCreate={handleCreateMarker}
      />
      
      {/* Edit Marker Modal */}
      <EditMarkerModal
        visible={editMarkerModal.visible}
        marker={editMarkerModal.marker}
        onClose={() => setEditMarkerModal({ visible: false, marker: null })}
        onUpdate={handleUpdateMarker}
        onDelete={handleDeleteMarker}
      />
      </div>
    </MinimapErrorBoundary>
  );
}

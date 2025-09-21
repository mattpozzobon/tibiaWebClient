import React, { useState, useEffect, useRef, useCallback } from 'react';
import type GameClient from '../../../../core/gameclient';
import Position from '../../../../game/position';
import Canvas from '../../../../renderer/canvas';
import { usePlayer } from '../../../hooks/usePlayerAttribute';
import { MapMarker } from '../../../../types/map-marker';
import ContextMenu from './ContextMenu';
import CreateMarkerModal from '../modals/CreateMarkerModal';
import EditMarkerModal from '../modals/EditMarkerModal';
import './styles/Minimap.scss';

interface MinimapProps {
  gc: GameClient;
}

const ZOOM_LEVEL = 4;
const CANVAS_SIZE = 160;
const CENTER_POINT = CANVAS_SIZE / 2;

const MINIMAP_COLORS = [
  0xFF000000, 0xFF330000, 0xFF660000, 0xFF990000, 0xFFCC0000, 0xFFFF0000, 0xFF003300, 0xFF333300,
  0xFF663300, 0xFF993300, 0xFFCC3300, 0xFFFF3300, 0xFF006600, 0xFF336600, 0xFF666600, 0xFF996600,
  0xFFCC6600, 0xFFFF6600, 0xFF009900, 0xFF339900, 0xFF669900, 0xFF999900, 0xFFCC9900, 0xFFFF9900,
  0xFF00CC00, 0xFF33CC00, 0xFF66CC00, 0xFF99CC00, 0xFFCCCC00, 0xFFFFCC00, 0xFF00FF00, 0xFF33FF00,
  0xFF66FF00, 0xFF99FF00, 0xFFCCFF00, 0xFFFFFF00, 0xFF000033, 0xFF330033, 0xFF660033, 0xFF990033,
  0xFFCC0033, 0xFFFF0033, 0xFF003333, 0xFF333333, 0xFF663333, 0xFF993333, 0xFFCC3333, 0xFFFF3333,
  0xFF006633, 0xFF336633, 0xFF666633, 0xFF996633, 0xFFCC6633, 0xFFFF6633, 0xFF009933, 0xFF339933,
  0xFF669933, 0xFF999933, 0xFFCC9933, 0xFFFF9933, 0xFF00CC33, 0xFF33CC33, 0xFF66CC33, 0xFF99CC33,
  0xFFCCCC33, 0xFFFFCC33, 0xFF00FF33, 0xFF33FF33, 0xFF66FF33, 0xFF99FF33, 0xFFCCFF33, 0xFFFFFF33,
  0xFF000066, 0xFF330066, 0xFF660066, 0xFF990066, 0xFFCC0066, 0xFFFF0066, 0xFF003366, 0xFF333366,
  0xFF663366, 0xFF993366, 0xFFCC3366, 0xFFFF3366, 0xFF006666, 0xFF336666, 0xFF666666, 0xFF996666,
  0xFFCC6666, 0xFFFF6666, 0xFF009966, 0xFF339966, 0xFF669966, 0xFF999966, 0xFFCC9966, 0xFFFF9966,
  0xFF00CC66, 0xFF33CC66, 0xFF66CC66, 0xFF99CC66, 0xFFCCCC66, 0xFFFFCC66, 0xFF00FF66, 0xFF33FF66,
  0xFF66FF66, 0xFF99FF66, 0xFFCCFF66, 0xFFFFFF66, 0xFF000099, 0xFF330099, 0xFF660099, 0xFF990099,
  0xFFCC0099, 0xFFFF0099, 0xFF003399, 0xFF333399, 0xFF663399, 0xFF993399, 0xFFCC3399, 0xFFFF3399,
  0xFF006699, 0xFF336699, 0xFF666699, 0xFF996699, 0xFFCC6699, 0xFFFF6699, 0xFF009999, 0xFF339999,
  0xFF669999, 0xFF999999, 0xFFCC9999, 0xFFFF9999, 0xFF00CC99, 0xFF33CC99, 0xFF66CC99, 0xFF99CC99,
  0xFFCCCC99, 0xFFFFCC99, 0xFF00FF99, 0xFF33FF99, 0xFF66FF99, 0xFF99FF99, 0xFFCCFF99, 0xFFFFFF99,
  0xFF0000CC, 0xFF3300CC, 0xFF6600CC, 0xFF9900CC, 0xFFCC00CC, 0xFFFF00CC, 0xFF0033CC, 0xFF3333CC,
  0xFF6633CC, 0xFF9933CC, 0xFFCC33CC, 0xFFFF33CC, 0xFF0066CC, 0xFF3366CC, 0xFF6666CC, 0xFF9966CC,
  0xFFCC66CC, 0xFFFF66CC, 0xFF0099CC, 0xFF3399CC, 0xFF6699CC, 0xFF9999CC, 0xFFCC99CC, 0xFFFF99CC,
  0xFF00CCCC, 0xFF33CCCC, 0xFF66CCCC, 0xFF99CCCC, 0xFFCCCCCC, 0xFFFFCCCC, 0xFF00FFCC, 0xFF33FFCC,
  0xFF66FFCC, 0xFF99FFCC, 0xFFCCFFCC, 0xFFFFFFCC, 0xFF0000FF, 0xFF3300FF, 0xFF6600FF, 0xFF9900FF,
  0xFFCC00FF, 0xFFFF00FF, 0xFF0033FF, 0xFF3333FF, 0xFF6633FF, 0xFF9933FF, 0xFFCC33FF, 0xFFFF33FF,
  0xFF0066FF, 0xFF3366FF, 0xFF6666FF, 0xFF9966FF, 0xFFCC66FF, 0xFFFF66FF, 0xFF0099FF, 0xFF3399FF,
  0xFF6699FF, 0xFF9999FF, 0xFFCC99FF, 0xFFFF99FF, 0xFF00CCFF, 0xFF33CCFF, 0xFF66CCFF, 0xFF99CCFF,
  0xFFCCCCFF, 0xFFFFCCFF, 0xFF00FFFF, 0xFF33FFFF, 0xFF66FFFF, 0xFF99FFFF, 0xFFCCFFFF, 0xFFFFFFFF
];

export default function Minimap({ gc }: MinimapProps) {
  const player = usePlayer(gc);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<Canvas | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const chunksRef = useRef<any>({});
  const currentFloorRef = useRef<number>(0);

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
        minimapCanvasRef.current = new Canvas(null, CANVAS_SIZE, CANVAS_SIZE);
        setIsInitialized(true);
      } catch (error) {
        setIsInitialized(false);
      }
    }
  }, []);

  // Preload marker images
  useEffect(() => {
    const loadMarkerImages = async () => {
      const imagePromises = ['flag0.png', 'flag1.png', 'flag12.png'].map((iconName) => {
        return new Promise<{ name: string; image: HTMLImageElement }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ name: iconName, image: img });
          img.onerror = () => reject(new Error(`Failed to load ${iconName}`));
          img.src = `/data/minimap/${iconName}`;
        });
      });

      try {
        const loadedImages = await Promise.all(imagePromises);
        const imageMap: { [key: string]: HTMLImageElement } = {};
        loadedImages.forEach(({ name, image }) => {
          imageMap[name] = image;
        });
        setMarkerImages(imageMap);
      } catch (error) {
        console.warn('Failed to load some marker images:', error);
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
        
        const index = (tile.getPosition().x % 128) + ((tile.getPosition().y % 128) * 128);
        buffer.view[index] = MINIMAP_COLORS[color];
        
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
    ctx.fillRect(CENTER_POINT, CENTER_POINT, ZOOM_LEVEL, ZOOM_LEVEL);
  }, [player]);

  const drawMarkersOnFinalCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!player || markers.length === 0) return;

    const currentPos = player.getPosition();
    const currentX = currentPos.x;
    const currentY = currentPos.y;
    
    // Pre-calculate zoom transformation values
    const sourceSize = CANVAS_SIZE / ZOOM_LEVEL;
    const sourceOffset = (CANVAS_SIZE - sourceSize) / 2;
    
    // Pre-calculate bounds for culling
    const minX = -sourceOffset * ZOOM_LEVEL;
    const maxX = (CANVAS_SIZE - sourceOffset) * ZOOM_LEVEL;
    const minY = -sourceOffset * ZOOM_LEVEL;
    const maxY = (CANVAS_SIZE - sourceOffset) * ZOOM_LEVEL;

    markers.forEach((marker) => {
      // Convert world coordinates to final canvas coordinates (optimized)
      const minimapX = marker.x - currentX + CENTER_POINT;
      const minimapY = marker.y - currentY + CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const finalX = (minimapX - sourceOffset) * ZOOM_LEVEL;
      const finalY = (minimapY - sourceOffset) * ZOOM_LEVEL;

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
        x * 128 - player!.getPosition().x + CENTER_POINT,
        y * 128 - player!.getPosition().y + CENTER_POINT
      );
    });

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        const sourceSize = CANVAS_SIZE / ZOOM_LEVEL;
        const sourceOffset = (CANVAS_SIZE - sourceSize) / 2;
        
        ctx.drawImage(
          minimap.canvas,
          sourceOffset, sourceOffset, sourceSize, sourceSize,
          0, 0, CANVAS_SIZE, CANVAS_SIZE
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
    const radius = CENTER_POINT;

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
    const sourceSize = CANVAS_SIZE / ZOOM_LEVEL;
    const sourceOffset = (CANVAS_SIZE - sourceSize) / 2;
    
    // Convert final canvas coordinates back to minimap coordinates
    const minimapX = (x / ZOOM_LEVEL) + sourceOffset;
    const minimapY = (y / ZOOM_LEVEL) + sourceOffset;
    
    // Convert minimap coordinates to world coordinates
    const worldX = minimapX - CENTER_POINT + currentPos.x;
    const worldY = minimapY - CENTER_POINT + currentPos.y;
    
    // Check if right-clicking on an existing marker
    // Use the same coordinate transformation as rendering for accurate collision detection
    const clickedMarker = markers.find(marker => {
      // Convert marker world coordinates to final canvas coordinates (same as rendering)
      const markerMinimapX = marker.x - currentPos.x + CENTER_POINT;
      const markerMinimapY = marker.y - currentPos.y + CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const markerFinalX = (markerMinimapX - sourceOffset) * ZOOM_LEVEL;
      const markerFinalY = (markerMinimapY - sourceOffset) * ZOOM_LEVEL;
      
      // Check if click coordinates match marker coordinates (with tolerance)
      const clickTolerance = 20; // Pixels of tolerance for clicking
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
    const sourceSize = CANVAS_SIZE / ZOOM_LEVEL;
    const sourceOffset = (CANVAS_SIZE - sourceSize) / 2;
    
    // Convert final canvas coordinates back to minimap coordinates
    const minimapX = (x / ZOOM_LEVEL) + sourceOffset;
    const minimapY = (y / ZOOM_LEVEL) + sourceOffset;
    
    // Convert minimap coordinates to world coordinates
    const worldX = minimapX - CENTER_POINT + currentPos.x;
    const worldY = minimapY - CENTER_POINT + currentPos.y;
    
    // Check if mouse is over a marker (optimized with early exit)
    // Use the same coordinate transformation as rendering for accurate collision detection
    let markerUnderMouse = null;
    for (const marker of markers) {
      // Convert marker world coordinates to final canvas coordinates (same as rendering)
      const markerMinimapX = marker.x - currentPos.x + CENTER_POINT;
      const markerMinimapY = marker.y - currentPos.y + CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const markerFinalX = (markerMinimapX - sourceOffset) * ZOOM_LEVEL;
      const markerFinalY = (markerMinimapY - sourceOffset) * ZOOM_LEVEL;
      
      // Check if mouse coordinates match marker coordinates (with tolerance)
      const hoverTolerance = 20; // Pixels of tolerance for hovering
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
    const sourceSize = CANVAS_SIZE / ZOOM_LEVEL;
    const sourceOffset = (CANVAS_SIZE - sourceSize) / 2;
    
    // Convert final canvas coordinates back to minimap coordinates
    const minimapX = (x / ZOOM_LEVEL) + sourceOffset;
    const minimapY = (y / ZOOM_LEVEL) + sourceOffset;
    
    // Convert minimap coordinates to world coordinates
    const worldX = minimapX - CENTER_POINT + currentPos.x;
    const worldY = minimapY - CENTER_POINT + currentPos.y;
    
    // Check if clicked on a marker (optimized with early exit)
    // Use the same coordinate transformation as rendering for accurate collision detection
    for (const marker of markers) {
      // Convert marker world coordinates to final canvas coordinates (same as rendering)
      const markerMinimapX = marker.x - currentPos.x + CENTER_POINT;
      const markerMinimapY = marker.y - currentPos.y + CENTER_POINT;
      
      // Convert minimap coordinates to final canvas coordinates
      const markerFinalX = (markerMinimapX - sourceOffset) * ZOOM_LEVEL;
      const markerFinalY = (markerMinimapY - sourceOffset) * ZOOM_LEVEL;
      
      // Check if click coordinates match marker coordinates (with tolerance)
      const clickTolerance = 20; // Pixels of tolerance for clicking
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
    
    const mainCanvas = canvasRef.current;
    const magnifierCanvas = magnifierCanvasRef.current;
    const ctx = magnifierCanvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear the magnifier canvas
    ctx.clearRect(0, 0, 120, 120);
    
    // Calculate the source region (40x40 pixels around the mouse)
    const sourceSize = 40;
    const sourceX = Math.max(0, Math.min(CANVAS_SIZE - sourceSize, magnifier.x - sourceSize / 2));
    const sourceY = Math.max(0, Math.min(CANVAS_SIZE - sourceSize, magnifier.y - sourceSize / 2));
    
    // Draw the magnified region (3x zoom)
    ctx.drawImage(
      mainCanvas,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, 120, 120
    );
    
    // Draw crosshair to show exact mouse position
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Calculate crosshair position in magnifier (center of the magnifier)
    const crosshairX = 60;
    const crosshairY = 60;
    
    // Draw horizontal crosshair line
    ctx.beginPath();
    ctx.moveTo(0, crosshairY);
    ctx.lineTo(120, crosshairY);
    ctx.stroke();
    
    // Draw vertical crosshair line
    ctx.beginPath();
    ctx.moveTo(crosshairX, 0);
    ctx.lineTo(crosshairX, 120);
    ctx.stroke();
    
    // Draw center dot
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(crosshairX, crosshairY, 2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.setLineDash([]); // Reset line dash
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

  if (!player || !isInitialized) {
    return null;
  }

  return (
    <div className="minimap-container">
      <div className="minimap-canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="minimap-canvas"
          onContextMenu={handleCanvasRightClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onClick={handleCanvasClick}
        />
        
        {/* Hover tooltip */}
        {hoveredMarker && (
          <div 
            className="marker-tooltip"
            style={{
              position: 'absolute',
              left: '10px',
              top: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            {hoveredMarker.description}
          </div>
        )}
        
        {/* Magnifier */}
        {magnifier.visible && (
          <div
            className="minimap-magnifier"
            style={{
              position: 'fixed',
              left: magnifier.displayX,
              top: magnifier.displayY,
              width: '120px',
              height: '120px',
              border: '2px solid #fff',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.9)',
              pointerEvents: 'none',
              zIndex: 1001,
              overflow: 'hidden',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
            }}
          >
            <canvas
              ref={magnifierCanvasRef}
              width="120"
              height="120"
              style={{
                width: '120px',
                height: '120px',
                pointerEvents: 'none'
              }}
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
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type GameClient from '../../../../core/gameclient';
import Position from '../../../../game/position';
import Canvas from '../../../../renderer/canvas';
import { usePlayer } from '../../../hooks/usePlayerAttribute';
import { MapMarker } from '../../../../types/map-marker';
import { MINIMAP_CONFIG, MINIMAP_COLORS_EARTHY, MINIMAP_COLORS } from '../../../../config/minimap-config';
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<Canvas | null>(null);
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const chunksRef = useRef<any>({});
  const currentFloorRef = useRef<number>(0);
  const spatialIndexRef = useRef<MarkerSpatialIndex>(new MarkerSpatialIndex());

  const viewCenterRef = useRef<Position | null>(null);
  const prevCenterRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const isPanningRef = useRef(false);
  const panStartClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartViewRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const skipNextClickRef = useRef(false);

  const cacheTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPanCacheRef = useRef(0);

  const [isInitialized, setIsInitialized] = useState(false);
  const [renderLayer, setRenderLayer] = useState(0);
  const [isFollowingPlayer, setIsFollowingPlayer] = useState(true);
  const [viewCenterVersion, setViewCenterVersion] = useState(0);

  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [markerImages, setMarkerImages] = useState<{ [key: string]: HTMLImageElement }>({});

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [createMarkerModal, setCreateMarkerModal] = useState<{ visible: boolean; x: number; y: number; floor: number }>({ visible: false, x: 0, y: 0, floor: 0 });
  const [editMarkerModal, setEditMarkerModal] = useState<{ visible: boolean; marker: MapMarker | null }>({ visible: false, marker: null });
  const [hoveredMarker, setHoveredMarker] = useState<MapMarker | null>(null);

  const [magnifier, setMagnifier] = useState<{ visible: boolean; x: number; y: number; mouseX: number; mouseY: number; displayX: number; displayY: number; }>(
    { visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 }
  );

  const [zoomLevel, setZoomLevel] = useState<number>(MINIMAP_CONFIG.ZOOM_LEVEL);
  const baseZoom = MINIMAP_CONFIG.ZOOM_LEVEL;
  const maxZoom = baseZoom; // default starts at max
  const minZoom = Math.max(1, baseZoom - 3); // allow 3 steps out
  const handleZoomIn = useCallback(() => setZoomLevel(prev => Math.min(prev + 1, maxZoom)), [maxZoom]);
  const handleZoomOut = useCallback(() => setZoomLevel(prev => Math.max(prev - 1, minZoom)), [minZoom]);
  
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Scroll up = zoom in
      handleZoomIn();
    } else {
      // Scroll down = zoom out
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = MINIMAP_CONFIG.CANVAS_SIZE * dpr;
    canvas.height = MINIMAP_CONFIG.CANVAS_SIZE * dpr;
    canvas.style.width = `${MINIMAP_CONFIG.CANVAS_SIZE}px`;
    canvas.style.height = `${MINIMAP_CONFIG.CANVAS_SIZE}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    if (!minimapCanvasRef.current) {
      try {
        minimapCanvasRef.current = new Canvas(null, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE);
        setIsInitialized(true);
      } catch {
        setIsInitialized(false);
      }
    }
  }, []);

  useEffect(() => {
    const loadMarkerImages = async () => {
      
      const imageMap = await ImageLoader.preloadMarkerImages();
      setMarkerImages(Object.fromEntries(imageMap));
      
    };
    loadMarkerImages();
  }, []);

  const getActiveViewCenter = useCallback(() => {
    if (viewCenterRef.current) return viewCenterRef.current;
    if (player) {
      const p = player.getPosition();
      return new Position(p.x, p.y, p.z);
    }
    return new Position(0, 0, currentFloorRef.current || 0);
  }, [player]);

  const getQuantizedCenter = useCallback(() => {
    const c = getActiveViewCenter();
    return new Position(Math.round(c.x), Math.round(c.y), c.z);
  }, [getActiveViewCenter]);

  const setViewCenter = useCallback((x: number, y: number, z?: number) => {
    const prev = getActiveViewCenter();
    viewCenterRef.current = new Position(x, y, z !== undefined ? z : prev.z);
    setViewCenterVersion(v => v + 1);
  }, [getActiveViewCenter]);

  const getTileColor = useCallback((tile: any) => {
    const itemColors = tile.items.map((i: any) => i.getMinimapColor()).filter((x: any) => x !== null);
    if (itemColors.length) return itemColors[itemColors.length - 1];
    return tile.getMinimapColor();
  }, []);

  const loadMarkers = useCallback(async () => {
    if (!gc.database) return;
    try {
      const loaded = await gc.database.getMapMarkersForFloor(renderLayer);
      setMarkers(loaded);
      spatialIndexRef.current.updateIndex(loaded);
    } catch {
      setMarkers([]);
    }
  }, [gc.database, renderLayer]);

  const updateChunks = useCallback((chunks: any) => {
    if (!gc.world || !player || !gc.database) return;
    const currentFloor = player.getPosition().z;
    const modified = new Set<string>();
    gc.world.chunks.forEach((chunk: any) => {
      const tiles = chunk.getFloorTiles(currentFloor);
      tiles.forEach((tile: any) => {
        if (!tile) return;
        if (!player!.canSee(tile)) return;
        const color = getTileColor(tile);
        if (color === null) return;
        const chunkId = gc.database.getMinimapChunkId(tile.getPosition());
        const buffer = chunks[chunkId];
        if (!buffer) return;
        const index =
          (tile.getPosition().x % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE) +
          ((tile.getPosition().y % MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE) * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE);
        const DEFAULT_COLOR = 0xFF000000;
        const idx = (color ?? -1) | 0;
        const colorValue = MINIMAP_COLORS[idx] ?? DEFAULT_COLOR;
        buffer.view[index] = colorValue;
        modified.add(chunkId);
      });
    });
    modified.forEach((id: string) => gc.database.saveMinimapChunk(id));
  }, [gc.world, player, gc.database, getTileColor]);

  const computeZoomWindow = useCallback(() => {
    const sourceSize = MINIMAP_CONFIG.CANVAS_SIZE / zoomLevel;
    const sourceOffset = (MINIMAP_CONFIG.CANVAS_SIZE - sourceSize) / 2;
    return { sourceSize, sourceOffset };
  }, [zoomLevel]);

  const worldTileTopLeftToFinal = useCallback((wx: number, wy: number) => {
    const { sourceOffset } = computeZoomWindow();
    const c = getQuantizedCenter();
    const x = (wx - c.x + MINIMAP_CONFIG.CENTER_POINT - sourceOffset) * zoomLevel;
    const y = (wy - c.y + MINIMAP_CONFIG.CENTER_POINT - sourceOffset) * zoomLevel;
    return {
      x: Math.floor(x / zoomLevel) * zoomLevel,
      y: Math.floor(y / zoomLevel) * zoomLevel
    };
  }, [computeZoomWindow, getQuantizedCenter, zoomLevel]);

  const worldTileCenterToFinal = useCallback((wx: number, wy: number) => {
    const tl = worldTileTopLeftToFinal(wx, wy);
    return { cx: tl.x + zoomLevel / 2, cy: tl.y + zoomLevel / 2 };
  }, [worldTileTopLeftToFinal, zoomLevel]);

  const finalCanvasToWorld = useCallback((fx: number, fy: number) => {
    const { sourceOffset } = computeZoomWindow();
    const c = getQuantizedCenter();
    const minimapX = (fx / zoomLevel) + sourceOffset;
    const minimapY = (fy / zoomLevel) + sourceOffset;
    return { worldX: minimapX - MINIMAP_CONFIG.CENTER_POINT + c.x, worldY: minimapY - MINIMAP_CONFIG.CENTER_POINT + c.y };
  }, [computeZoomWindow, getQuantizedCenter, zoomLevel]);

  const finalCanvasToTile = useCallback((fx: number, fy: number) => {
    const { worldX, worldY } = finalCanvasToWorld(fx, fy);
    const tileX = Math.floor(worldX + 1e-6);
    const tileY = Math.floor(worldY + 1e-6);
    return { tileX, tileY };
  }, [finalCanvasToWorld]);

  const drawPlayerIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!player) return;
    const p = player.getPosition();
    const { x, y } = worldTileTopLeftToFinal(p.x, p.y);
    const size = zoomLevel;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size);
  }, [player, worldTileTopLeftToFinal, zoomLevel]);

  const drawMarkersOnFinalCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    const minX = 0, minY = 0, maxX = MINIMAP_CONFIG.CANVAS_SIZE, maxY = MINIMAP_CONFIG.CANVAS_SIZE;
    const baseZoom = MINIMAP_CONFIG.ZOOM_LEVEL;
    const zoomScale = Math.max(0.5, Math.min(2.5, zoomLevel / baseZoom));
    const markerScale = 1.6 * zoomScale; // slightly larger baseline so markers are readable

    for (const m of markers) {
      const { cx, cy } = worldTileCenterToFinal(m.x, m.y);
      if (cx < minX - 64 || cx > maxX + 64 || cy < minY - 64 || cy > maxY + 64) continue;
      const img = markerImages[m.icon];
      if (img && img.complete && img.naturalWidth > 0) {
        const w = img.naturalWidth * markerScale;
        const h = img.naturalHeight * markerScale;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      } else {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(4, 4 * markerScale), 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // DOM tooltip positioning data via CSS class; the element is rendered below
      // Positioning handled purely in CSS relative to the canvas container
    }
  }, [markers, markerImages, worldTileCenterToFinal, zoomLevel]);

  const render = useCallback((chunks: any) => {
    if (!minimapCanvasRef.current) return;
    const center = getQuantizedCenter();
    const minimap = minimapCanvasRef.current;
    const offctx = minimap.context;

    if (prevCenterRef.current && prevCenterRef.current.z === renderLayer) {
      const dx = prevCenterRef.current.x - center.x;
      const dy = prevCenterRef.current.y - center.y;
      if (dx !== 0 || dy !== 0) {
        offctx.save();
        offctx.globalCompositeOperation = 'copy';
        offctx.drawImage(minimap.canvas, dx, dy);
        offctx.restore();
        if (dx > 0) offctx.clearRect(0, 0, dx, MINIMAP_CONFIG.CANVAS_SIZE);
        else if (dx < 0) offctx.clearRect(MINIMAP_CONFIG.CANVAS_SIZE + dx, 0, -dx, MINIMAP_CONFIG.CANVAS_SIZE);
        if (dy > 0) offctx.clearRect(0, 0, MINIMAP_CONFIG.CANVAS_SIZE, dy);
        else if (dy < 0) offctx.clearRect(0, MINIMAP_CONFIG.CANVAS_SIZE + dy, MINIMAP_CONFIG.CANVAS_SIZE, -dy);
      }
    } else {
      offctx.clearRect(0, 0, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE);
    }
    prevCenterRef.current = { x: center.x, y: center.y, z: renderLayer };

    Object.keys(chunks).forEach((id: string) => {
      const ch = chunks[id];
      if (!ch) return;
      const [cx, cy, cz] = id.split('.').map(Number);
      if (cz !== renderLayer) return;

      offctx.putImageData(
        ch.imageData,
        cx * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE - center.x + MINIMAP_CONFIG.CENTER_POINT,
        cy * MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE - center.y + MINIMAP_CONFIG.CENTER_POINT
      );
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE);

    const { sourceSize, sourceOffset } = computeZoomWindow();
    ctx.drawImage(
      minimap.canvas,
      sourceOffset, sourceOffset, sourceSize, sourceSize,
      0, 0, MINIMAP_CONFIG.CANVAS_SIZE, MINIMAP_CONFIG.CANVAS_SIZE
    );

    drawMarkersOnFinalCanvas(ctx);
    drawPlayerIndicator(ctx);
  }, [renderLayer, computeZoomWindow, drawMarkersOnFinalCanvas, drawPlayerIndicator, getQuantizedCenter]);

  const chunkUpdate = useCallback((chunks: any) => {
    chunksRef.current = chunks;
    updateChunks(chunks);
    render(chunks);
  }, [updateChunks, render]);

  const cache = useCallback(() => {
    if (!gc.database || !gc.world) return;
    const center = getQuantizedCenter();
    const z = center.z;
    const EXTRA_MARGIN = MINIMAP_CONFIG.MINIMAP_CHUNK_SIZE * 2;
    const radius = MINIMAP_CONFIG.CENTER_POINT + EXTRA_MARGIN;
    const positions = [
      new Position(center.x, center.y, z),
      new Position(center.x - radius, center.y - radius, z),
      new Position(center.x, center.y - radius, z),
      new Position(center.x + radius, center.y - radius, z),
      new Position(center.x + radius, center.y, z),
      new Position(center.x + radius, center.y + radius, z),
      new Position(center.x, center.y + radius, z),
      new Position(center.x - radius, center.y + radius, z),
      new Position(center.x - radius, center.y, z)
    ];
    try {
      gc.database.preloadMinimapChunks(positions, chunkUpdate);
    } catch {}
  }, [gc.database, gc.world, chunkUpdate, getQuantizedCenter]);

  const schedulePanCache = useCallback(() => {
    const now = performance.now();
    const PAN_CACHE_MS = 80;
    if (now - lastPanCacheRef.current < PAN_CACHE_MS) return;
    lastPanCacheRef.current = now;
    cache();
  }, [cache]);

  const debouncedCache = useCallback(() => {
    if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
    cacheTimeoutRef.current = setTimeout(() => { cache(); }, 100);
  }, [cache]);

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
      const t = setTimeout(initialLoad, 100);
      return () => clearTimeout(t);
    }
  }, [player, isInitialized, cache, isFollowingPlayer, setViewCenter]);

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
      if (chunksRef.current) render(chunksRef.current);
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
  }, [player, isInitialized, cache, gc.database, isFollowingPlayer, getQuantizedCenter, setViewCenter, zoomLevel, render, schedulePanCache]);

  useEffect(() => {
    if (!player || !isInitialized) return;
    return () => {
      if (cacheTimeoutRef.current) clearTimeout(cacheTimeoutRef.current);
      gc.database.saveAllMinimapChunks();
    };
  }, [player, isInitialized, gc.database]);

  useEffect(() => {
    if (chunksRef.current) {
      render(chunksRef.current);
      debouncedCache();
    }
  }, [viewCenterVersion, render, debouncedCache]);

  const handleCanvasRightClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!player) return;

    const rect = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const scaleX = MINIMAP_CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = MINIMAP_CONFIG.CANVAS_SIZE / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;

    const { tileX, tileY } = finalCanvasToTile(x, y);

    const clickedByTile = markers.find(m =>
      Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current
    );
    const clicked = clickedByTile || markers.find(m => {
      const { cx, cy } = worldTileCenterToFinal(m.x, m.y);
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
  }, [player, markers, markerImages, finalCanvasToTile, worldTileCenterToFinal]);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const scaleX = MINIMAP_CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = MINIMAP_CONFIG.CANVAS_SIZE / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;

    const magnifierSize = MINIMAP_CONFIG.MAGNIFIER_SIZE;
    const gap = 10;
    // Anchor magnifier to the outside edge of the minimap based on which window column it's in
    const canvasEl = event.currentTarget as HTMLCanvasElement;
    const inRightColumn = !!(canvasEl.closest && canvasEl.closest('.window-column-right'));
    const inLeftColumn = !!(canvasEl.closest && canvasEl.closest('.window-column-left'));
    // If in right column -> show magnifier on left side of minimap; if in left column -> on right side
    let displayX = inRightColumn
      ? rect.left - magnifierSize - gap
      : rect.right + gap;
    // Fallback: if neither matched, position relative to cursor but clamp
    if (!inRightColumn && !inLeftColumn) {
      displayX = event.clientX + gap;
    }
    // Fix vertical position: center to minimap vertically, do not follow cursor
    let displayY = rect.top + (rect.height / 2) - (magnifierSize / 2);
    displayY = Math.max(10, Math.min(displayY, window.innerHeight - magnifierSize - 10));
    // Clamp X within viewport
    displayX = Math.max(10, Math.min(displayX, window.innerWidth - magnifierSize - 10));

    setMagnifier({ visible: true, x, y, mouseX: event.clientX, mouseY: event.clientY, displayX, displayY });

    if (!player) { setHoveredMarker(null); return; }

    const { tileX, tileY } = finalCanvasToTile(x, y);

    let over: MapMarker | null = null;
    const hoverByTile = markers.find(m =>
      Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current
    );
    if (hoverByTile) {
      over = hoverByTile;
    } else {
      for (const m of markers) {
        const { cx, cy } = worldTileCenterToFinal(m.x, m.y);
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
  }, [player, markers, markerImages, finalCanvasToTile, worldTileCenterToFinal]);

  const handleCanvasMouseLeave = useCallback(() => {
    setMagnifier({ visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 });
    setHoveredMarker(null);
    isPanningRef.current = false;
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    isPanningRef.current = true;
    panStartClientRef.current = { x: event.clientX, y: event.clientY };
    const c = getActiveViewCenter();
    panStartViewRef.current = { x: c.x, y: c.y, z: c.z };
    skipNextClickRef.current = false;
  }, [getActiveViewCenter]);

  const handleMouseUp = useCallback(() => { isPanningRef.current = false; }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (skipNextClickRef.current) { skipNextClickRef.current = false; return; }
    if (!player || !markers.length) return;

    const rect = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const scaleX = MINIMAP_CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = MINIMAP_CONFIG.CANVAS_SIZE / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;

    const { tileX, tileY } = finalCanvasToTile(x, y);

    const clickedByTile = markers.find(m =>
      Math.floor(m.x) === tileX && Math.floor(m.y) === tileY && m.floor === currentFloorRef.current
    );
    if (clickedByTile) {
      setEditMarkerModal({ visible: true, marker: clickedByTile });
      return;
    }

    for (const m of markers) {
      const { cx, cy } = worldTileCenterToFinal(m.x, m.y);
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
  }, [player, markers, markerImages, finalCanvasToTile, worldTileCenterToFinal]);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const scaleX = MINIMAP_CONFIG.CANVAS_SIZE / rect.width;
    const scaleY = MINIMAP_CONFIG.CANVAS_SIZE / rect.height;
    const x = rawX * scaleX;
    const y = rawY * scaleY;
    const { worldX, worldY } = finalCanvasToWorld(x, y);
    setViewCenter(worldX, worldY, currentFloorRef.current);
    setIsFollowingPlayer(false);
    if (chunksRef.current) render(chunksRef.current);
  }, [finalCanvasToWorld, setViewCenter, render]);

  const updateMagnifier = useCallback(() => {
    if (!magnifier.visible || !canvasRef.current || !magnifierCanvasRef.current) return;

    const main = canvasRef.current;
    const mcv = magnifierCanvasRef.current;
    const ctx = mcv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, MINIMAP_CONFIG.MAGNIFIER_SIZE, MINIMAP_CONFIG.MAGNIFIER_SIZE);
    const sourceSize = MINIMAP_CONFIG.MAGNIFIER_SOURCE_SIZE; // in logical canvas units
    // Convert logical canvas units to backing-store pixels using DPR scale
    const dprScale = main.width / MINIMAP_CONFIG.CANVAS_SIZE;
    const srcSizePx = sourceSize * dprScale;
    const sx = Math.max(0, Math.min(main.width  - srcSizePx, magnifier.x * dprScale - srcSizePx / 2));
    const sy = Math.max(0, Math.min(main.height - srcSizePx, magnifier.y * dprScale - srcSizePx / 2));
    ctx.drawImage(main, sx, sy, srcSizePx, srcSizePx, 0, 0, MINIMAP_CONFIG.MAGNIFIER_SIZE, MINIMAP_CONFIG.MAGNIFIER_SIZE);
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    const cx = MINIMAP_CONFIG.MAGNIFIER_SIZE / 2;
    const cy = MINIMAP_CONFIG.MAGNIFIER_SIZE / 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(MINIMAP_CONFIG.MAGNIFIER_SIZE, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, MINIMAP_CONFIG.MAGNIFIER_SIZE); ctx.stroke();
    ctx.setLineDash([]);

  }, [magnifier.visible, magnifier.x, magnifier.y]);

  useEffect(() => { if (magnifier.visible) updateMagnifier(); }, [magnifier.visible, magnifier.x, magnifier.y, updateMagnifier]);

  const handleCreateMarker = useCallback(async (data: Omit<MapMarker, 'id' | 'createdAt'>) => {
    if (!gc.database) return;
    try { await gc.database.saveMapMarker(data); await loadMarkers(); }
    catch { alert('Failed to create marker'); }
  }, [gc.database, loadMarkers]);

  const handleUpdateMarker = useCallback(async (m: MapMarker) => {
    if (!gc.database) return;
    try { await gc.database.updateMapMarker(m); await loadMarkers(); }
    catch { alert('Failed to update marker'); }
  }, [gc.database, loadMarkers]);

  const handleDeleteMarker = useCallback(async (id: string) => {
    if (!gc.database) return;
    try { await gc.database.deleteMapMarker(id); await loadMarkers(); }
    catch { alert('Failed to delete marker'); }
  }, [gc.database, loadMarkers]);

  useEffect(() => { loadMarkers(); }, [loadMarkers]);

  useEffect(() => {
    MemoryManager.registerCache('markerImages', new Map(Object.entries(markerImages)));
    const cleanup = () => { spatialIndexRef.current.clear(); };
    MemoryManager.registerCleanup(cleanup);
    const perfInterval = setInterval(() => {
      MemoryManager.logMemoryStats();
    }, 30000);
    return () => {
      MemoryManager.unregisterCleanup(cleanup);
      clearInterval(perfInterval);
    };
  }, [markerImages]);

  if (!player || !isInitialized) return null;

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
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onClick={handleCanvasClick}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
          />
        </div>

        {/* Zoom controls under minimap */}
        <div className="minimap-zoom-controls">
          <button className="zoom-button zoom-in" onClick={handleZoomIn} disabled={zoomLevel >= maxZoom} title="Zoom In">+</button>
          <span className="zoom-level-display">{zoomLevel}</span>
          <button className="zoom-button zoom-out" onClick={handleZoomOut} disabled={zoomLevel <= minZoom} title="Zoom Out">−</button>
        </div>


      </div>

      {/* Render context menu as portal to document.body to escape window constraints */}
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
                try { await gc.database.deleteMapMarker(m.id); await loadMarkers(); }
                catch { alert('Failed to delete marker'); }
              }, className: 'delete' }
          ] : [
            { label: 'Create Marker', onClick: () => setCreateMarkerModal(prev => ({ ...prev, visible: true })) }
          ]}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        />,
        document.body
      )}

      {/* Render modals as portals to document.body to escape window constraints */}
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

      {/* Render magnifier as portal to document.body to escape window constraints */}
      {createPortal(
        magnifier.visible && (
          <div 
            className="minimap-magnifier" 
            style={{ left: magnifier.displayX, top: magnifier.displayY }}
            data-minimap-portal="magnifier"
          >
            <canvas ref={magnifierCanvasRef} width="120" height="120" />
          </div>
        ),
        document.body
      )}

      {/* Render marker tooltip as portal to document.body to escape window constraints */}
      {createPortal(
        hoveredMarker && hoveredMarker.description && hoveredMarker.description.trim() && magnifier.visible && (
          <div 
            className="marker-tooltip marker-tooltip-portal"
            style={{ 
              left: magnifier.displayX, // Position to the right of magnifier center
              top: magnifier.displayY   // Position above magnifier
            }}
            data-minimap-portal="tooltip"
          >
            {hoveredMarker.description}
          </div>
        ),
        document.body
      )}
    </MinimapErrorBoundary>
  );
}

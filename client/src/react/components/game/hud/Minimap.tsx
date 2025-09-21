import React, { useState, useEffect, useRef, useCallback } from 'react';
import type GameClient from '../../../../core/gameclient';
import Position from '../../../../game/position';
import Canvas from '../../../../renderer/canvas';
import { usePlayer } from '../../../hooks/usePlayerAttribute';
import './styles/Minimap.scss';

interface MinimapProps {
  gc: GameClient;
}

// Constants
const ZOOM_LEVEL = 4;
const CANVAS_SIZE = 160;
const CENTER_POINT = CANVAS_SIZE / 2;

export default function Minimap({ gc }: MinimapProps) {
  // Use the player hook to wait for player to be available
  const player = usePlayer(gc);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<Canvas | null>(null);
  const chunksRef = useRef<any>({});
  const lastPlayerPositionRef = useRef<Position | null>(null);
  const lastPlayerFloorRef = useRef<number | null>(null);

  // State
  const [renderLayer, setRenderLayer] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Minimap colors (converted from hex to RGB for canvas)
  const colors = useRef([
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
  ]);

  // Initialize minimap canvas
  useEffect(() => {
    if (!minimapCanvasRef.current) {
      try {
        minimapCanvasRef.current = new Canvas(null, CANVAS_SIZE, CANVAS_SIZE);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize minimap canvas:', error);
      }
    }
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

  const updateChunks = useCallback((chunks: any) => {
    if (!gc.world || !player || !gc.database) return;

    const currentFloor = player.getPosition().z;
    
    gc.world.chunks.forEach((chunk: any) => {
      const tiles = chunk.getFloorTiles(currentFloor);
      tiles.forEach((tile: any) => {
        if (tile === null) return;
        if (!player!.canSee(tile)) return;
        
        const color = getTileColor(tile);
        if (color === null) return;
        
        const buffer = chunks[gc.database.getMinimapChunkId(tile.getPosition())];
        if (!buffer) return;
        
        const index = (tile.getPosition().x % 128) + ((tile.getPosition().y % 128) * 128);
        buffer.view[index] = colors.current[color];
      });
    });
  }, [gc.world, player, gc.database, getTileColor]);

  // Draw pixel-perfect player indicator
  const drawPlayerIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!player) return;
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(CENTER_POINT, CENTER_POINT, ZOOM_LEVEL, ZOOM_LEVEL);
  }, [player]);

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

    // Copy to display canvas with zoom
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // Disable image smoothing for sharp pixel-perfect scaling
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        // Apply zoom - take smaller area from center and scale to full canvas
        const sourceSize = CANVAS_SIZE / ZOOM_LEVEL;
        const sourceOffset = (CANVAS_SIZE - sourceSize) / 2;
        
        ctx.drawImage(
          minimap.canvas,
          sourceOffset, sourceOffset, sourceSize, sourceSize,
          0, 0, CANVAS_SIZE, CANVAS_SIZE
        );
        
        // Draw player indicator
        drawPlayerIndicator(ctx);
      }
    }
  }, [player, renderLayer, drawPlayerIndicator]);

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

    // Generate positions for minimap area
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
      console.warn('Failed to load minimap chunks:', error);
    }
  }, [player, gc.database, gc.world, chunkUpdate]);

  // Set initial render layer based on player position and handle floor changes
  useEffect(() => {
    if (player && isInitialized) {
      const playerZ = player.getPosition().z;
      setRenderLayer(playerZ);
      lastPlayerFloorRef.current = playerZ;
      lastPlayerPositionRef.current = player.getPosition();
      cache();
    }
  }, [player, isInitialized, cache]);

  // Simple player icon update - player is always centered
  useEffect(() => {
    if (!player || !isInitialized || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear center area and redraw player icon
    ctx.clearRect(77, 77, 6, 6);
    drawPlayerIndicator(ctx);
  }, [player, isInitialized, drawPlayerIndicator]);

  // Event-driven minimap updates instead of polling
  useEffect(() => {
    if (!player || !isInitialized) return;

    const handlePlayerMove = () => {
      if (!player || !isInitialized) return;
      
      const currentPosition = player.getPosition();
      const currentFloor = currentPosition.z;
      
      // Handle floor changes
      if (lastPlayerFloorRef.current !== null && lastPlayerFloorRef.current !== currentFloor) {
        setRenderLayer(currentFloor);
        lastPlayerFloorRef.current = currentFloor;
        chunksRef.current = {};
        cache();
        return;
      }
      
      // Update minimap on every move
      cache();
      
      // Immediate render with current chunks
      if (chunksRef.current && Object.keys(chunksRef.current).length > 0) {
        updateChunks(chunksRef.current);
        render(chunksRef.current);
      }
      
      lastPlayerPositionRef.current = currentPosition;
      lastPlayerFloorRef.current = currentFloor;
    };

    // Listen for player movement events
    const handleCreatureMove = (event: CustomEvent) => {
      const { id, position } = event.detail;
      if (id === player?.id) {
        handlePlayerMove();
      }
    };

    // Listen for creature server move events
    const handleServerMove = (event: CustomEvent) => {
      const { id, position } = event.detail;
      if (id === player?.id) {
        handlePlayerMove();
      }
    };

    // Add event listeners
    window.addEventListener('creatureMove', handleCreatureMove as EventListener);
    window.addEventListener('creatureServerMove', handleServerMove as EventListener);

    // Initial setup
    if (player) {
      lastPlayerPositionRef.current = player.getPosition();
      lastPlayerFloorRef.current = player.getPosition().z;
    }

    return () => {
      window.removeEventListener('creatureMove', handleCreatureMove as EventListener);
      window.removeEventListener('creatureServerMove', handleServerMove as EventListener);
    };
  }, [player, isInitialized, cache, updateChunks, render]);

  if (!player || !isInitialized) {
    return (
      <div className="minimap-container">
        <div className="minimap-loading">
          {!isInitialized ? 'Initializing canvas...' : 'Waiting for login...'}
        </div>
      </div>
    );
  }

  return (
    <div className="minimap-container">
      <div className="minimap-canvas-container">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="minimap-canvas"
        />
      </div>
    </div>
  );
}

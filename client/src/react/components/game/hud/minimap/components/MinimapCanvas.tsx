import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface MinimapCanvasProps {
  canvasSize: number;
  onContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
}

const MinimapCanvas = forwardRef<HTMLCanvasElement, MinimapCanvasProps>(({
  canvasSize,
  onContextMenu,
  onMouseDown,
  onMouseUp,
  onMouseMove,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onWheel
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useImperativeHandle(ref, () => canvasRef.current!);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [canvasSize]);
  
  return (
    <div className="minimap-canvas-container">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="minimap-canvas"
        onContextMenu={onContextMenu}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
      />
    </div>
  );
});

MinimapCanvas.displayName = 'MinimapCanvas';

export default MinimapCanvas;
export type { MinimapCanvasProps };

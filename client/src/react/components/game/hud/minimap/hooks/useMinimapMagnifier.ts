import { useState, useRef, useCallback, useEffect } from 'react';
import { MINIMAP_CONFIG } from '../../../../../../config/minimap-config';

export function useMinimapMagnifier(canvasRef: React.RefObject<HTMLCanvasElement | null>, canvasSize: number) {
  const magnifierCanvasRef = useRef<HTMLCanvasElement>(null);
  const [magnifier, setMagnifier] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    mouseX: number; 
    mouseY: number; 
    displayX: number; 
    displayY: number; 
  }>({ visible: false, x: 0, y: 0, mouseX: 0, mouseY: 0, displayX: 0, displayY: 0 });
  
  const updateMagnifier = useCallback(() => {
    if (!magnifier.visible || !canvasRef.current || !magnifierCanvasRef.current) return;

    const main = canvasRef.current;
    const mcv = magnifierCanvasRef.current;
    const ctx = mcv.getContext('2d');
    if (!ctx) return;
    
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const magnifierSize = MINIMAP_CONFIG.MAGNIFIER_SIZE;
    mcv.width = magnifierSize * dpr;
    mcv.height = magnifierSize * dpr;
    mcv.style.width = `${magnifierSize}px`;
    mcv.style.height = `${magnifierSize}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    ctx.clearRect(0, 0, magnifierSize, magnifierSize);
    const sourceSize = MINIMAP_CONFIG.MAGNIFIER_SOURCE_SIZE;
    const dprScale = main.width / canvasSize;
    const srcSizePx = sourceSize * dprScale;
    const sx = Math.max(0, Math.min(main.width - srcSizePx, magnifier.x * dprScale - srcSizePx / 2));
    const sy = Math.max(0, Math.min(main.height - srcSizePx, magnifier.y * dprScale - srcSizePx / 2));
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(main, sx, sy, srcSizePx, srcSizePx, 0, 0, magnifierSize, magnifierSize);
    
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    const cx = magnifierSize / 2;
    const cy = magnifierSize / 2;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(magnifierSize, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, magnifierSize); ctx.stroke();
    ctx.setLineDash([]);
  }, [magnifier.visible, magnifier.x, magnifier.y, canvasSize, canvasRef]);
  
  useEffect(() => {
    if (magnifier.visible) updateMagnifier();
  }, [magnifier.visible, magnifier.x, magnifier.y, updateMagnifier]);
  
  return {
    magnifier,
    setMagnifier,
    magnifierCanvasRef
  };
}

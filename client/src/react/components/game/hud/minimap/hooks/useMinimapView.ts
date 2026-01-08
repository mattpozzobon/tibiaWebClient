import { useRef, useState, useCallback } from 'react';
import Position from '../../../../../../game/position';
import type Player from '../../../../../../game/player/player';

export function useMinimapView(player: Player | null) {
  const viewCenterRef = useRef<Position | null>(null);
  const currentFloorRef = useRef<number>(0);
  const [isFollowingPlayer, setIsFollowingPlayer] = useState(true);
  const [viewCenterVersion, setViewCenterVersion] = useState(0);
  const [renderLayer, setRenderLayer] = useState(0);
  
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
  
  return {
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
  };
}

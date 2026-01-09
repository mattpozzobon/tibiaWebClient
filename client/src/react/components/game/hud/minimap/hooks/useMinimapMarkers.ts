import { useState, useEffect, useCallback, useRef } from 'react';
import { MapMarker } from '../../../../../../types/map-marker';
import { ImageLoader } from '../../../../../../utils/image-loader';
import { MarkerSpatialIndex } from '../../../../../../utils/spatial-index';
import { MemoryManager } from '../../../../../../utils/memory-manager';
import type GameClient from '../../../../../../core/gameclient';

export function useMinimapMarkers(gc: GameClient, renderLayer: number) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [markerImages, setMarkerImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const spatialIndexRef = useRef<MarkerSpatialIndex>(new MarkerSpatialIndex());
  
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
  
  useEffect(() => {
    const loadMarkerImages = async () => {
      const imageMap = await ImageLoader.preloadMarkerImages();
      setMarkerImages(Object.fromEntries(imageMap));
    };
    loadMarkerImages();
  }, []);
  
  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);
  
  useEffect(() => {
    MemoryManager.registerCache('markerImages', new Map(Object.entries(markerImages)));
    const cleanup = () => { spatialIndexRef.current.clear(); };
    MemoryManager.registerCleanup(cleanup);
    return () => {
      MemoryManager.unregisterCleanup(cleanup);
    };
  }, [markerImages]);
  
  return {
    markers,
    markerImages,
    loadMarkers,
    spatialIndexRef
  };
}

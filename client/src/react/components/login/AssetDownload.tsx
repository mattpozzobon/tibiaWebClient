import React, { useState, useEffect } from "react";
import type GameClient from "../../../core/gameclient";
import './styles/AssetDownload.scss';
import SpriteBuffer from "../../../renderer/sprite-buffer";

interface AssetDownloadProps {
  gc: GameClient;
  onDownloadComplete: () => void;
}

interface DownloadProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentFile: string;
}

interface UIState {
  progress: number;
  status: string;
  isComplete: boolean;
  currentFile: string;
}

export default function AssetDownload({ gc, onDownloadComplete }: AssetDownloadProps) {
  const [downloadState, setDownloadState] = useState<UIState>({
    progress: 0,
    status: "Checking assets...",
    isComplete: false,
    currentFile: ""
  });

  useEffect(() => {
    startAssetDownload();
  }, []);

  const startAssetDownload = async () => {
    try {
      // Check if assets are up to date first
      setDownloadState(prev => ({ ...prev, status: "Checking assets..." }));
      
      const assetsAreUpToDate = await gc.database.areAssetsUpToDate();
      
      if (assetsAreUpToDate) {
        setDownloadState({
          progress: 100,
          status: "Assets up to date!",
          isComplete: true,
          currentFile: ""
        });
        
        // Wait a moment then proceed
        setTimeout(() => {
          onDownloadComplete();
        }, 1000);
        
        return;
      }

      // Assets need to be downloaded - use our own download logic
      await downloadAssetsWithProgress();

    } catch (error) {
      console.error('Asset download failed:', error);
      setDownloadState({
        progress: 0,
        status: "Download failed. Please try again.",
        isComplete: false,
        currentFile: ""
      });
    }
  };

  const downloadAssetsWithProgress = async () => {
    const gameAssets = [
      { url: '/data/sprites/Tibia.spr', filename: 'Tibia.spr' },
      { url: '/data/sprites/Tibia.dat', filename: 'Tibia.dat' }
    ];

    const results = new Map<string, ArrayBuffer>();
    let totalDownloaded = 0;
    
    // Calculate total size first
    let totalSize = 0;
    setDownloadState(prev => ({ ...prev, status: "Calculating download size..." }));
    
    for (const file of gameAssets) {
      try {
        const response = await fetch(file.url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          totalSize += parseInt(contentLength, 10);
        }
      } catch (error) {
        console.warn(`Could not get size for ${file.filename}`);
      }
    }

    // Download each file with progress tracking
    for (let i = 0; i < gameAssets.length; i++) {
      const file = gameAssets[i];
      const fileProgress = (i / gameAssets.length) * 100;
      
      setDownloadState({
        progress: Math.round(fileProgress),
        status: `Downloading ${file.filename}...`,
        isComplete: false,
        currentFile: file.filename
      });

      try {
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        const chunks: Uint8Array[] = [];
        const fileSize = parseInt(response.headers.get('content-length') || '0', 10);
        let loadedSize = 0;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          loadedSize += value.length;
          
          // Calculate overall progress
          const fileProgressPercent = fileSize > 0 ? (loadedSize / fileSize) * 100 : 0;
          const overallProgress = fileProgress + (fileProgressPercent / gameAssets.length);
          
          setDownloadState({
            progress: Math.min(Math.round(overallProgress), 100),
            status: `Downloading ${file.filename}... (${Math.round(fileProgressPercent)}%)`,
            isComplete: false,
            currentFile: file.filename
          });
        }

        const fileData = new Blob(chunks).arrayBuffer();
        results.set(file.filename, await fileData);
        
      } catch (error) {
        throw new Error(`Failed to download ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Process downloaded assets
    setDownloadState({
      progress: 100,
      status: "Processing assets...",
      isComplete: false,
      currentFile: ""
    });

    // Process downloaded assets directly
    await processDownloadedAssets(results);

    // Download complete
    setDownloadState({
      progress: 100,
      status: "Download complete!",
      isComplete: true,
      currentFile: ""
    });

    // Wait a moment then proceed
    setTimeout(() => {
      onDownloadComplete();
    }, 1500);
  };

  const processDownloadedAssets = async (results: Map<string, ArrayBuffer>): Promise<void> => {
    const datData = results.get('Tibia.dat');
    const sprData = results.get('Tibia.spr');

    if (!datData || !sprData) {
      throw new Error('Missing required game assets');
    }

    // Load data file
    gc.dataObjects.load('Tibia.dat', {
      target: { result: datData }
    } as unknown as ProgressEvent<FileReader>);

    // Load sprite file
    SpriteBuffer.load('Tibia.spr', {
      target: { result: sprData }
    } as unknown as ProgressEvent<FileReader>);
  };

  const handleRetry = () => {
    setDownloadState({
      progress: 0,
      status: "Retrying download...",
      isComplete: false,
      currentFile: ""
    });
    startAssetDownload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80%',
      maxWidth: '600px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '3px solid #333',
      borderRadius: '10px',
      padding: '40px',
      zIndex: 10000,
      textAlign: 'center'
    }}>
      <h2 style={{ 
        color: 'white', 
        marginBottom: '30px',
        fontSize: '24px'
      }}>
        Downloading Game Assets
      </h2>
      
      <div style={{
        marginBottom: '30px'
      }}>
        <div style={{
          width: '100%',
          height: '30px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid #333',
          borderRadius: '15px',
          overflow: 'hidden',
          marginBottom: '15px'
        }}>
          <div style={{
            width: `${downloadState.progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00ff00, #66ff66)',
            borderRadius: '13px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{
          color: 'white',
          fontSize: '16px',
          marginBottom: '10px'
        }}>
          {downloadState.status}
        </div>
        
        <div style={{
          color: '#ccc',
          fontSize: '14px'
        }}>
          {Math.round(downloadState.progress)}%
        </div>
      </div>

      {downloadState.isComplete && (
        <div style={{
          color: '#00ff00',
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}>
          ✅ Ready to play!
        </div>
      )}

      {downloadState.status.includes('failed') && (
        <button
          onClick={handleRetry}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: '#ff6600',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Retry Download
        </button>
      )}

      <div style={{
        marginTop: '30px',
        color: '#999',
        fontSize: '12px'
      }}>
        This may take a few minutes depending on your connection speed.
      </div>
    </div>
  );
}

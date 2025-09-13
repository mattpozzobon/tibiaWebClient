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
      console.error('❌ Asset download failed:', error);
      console.error('❌ Error details:', error);
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
      console.log('✅ Asset download finished, calling onDownloadComplete');
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
    <div className="asset-download-container">
      <h2 className="asset-download-title">
        Downloading Game Assets
      </h2>
      
      <div className="progress-section">
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill"
            style={{ width: `${downloadState.progress}%` }}
          />
        </div>
        
        <div className="progress-status">
          {downloadState.status}
        </div>
        
        <div className="progress-percentage">
          {Math.round(downloadState.progress)}%
        </div>
      </div>

      {downloadState.isComplete && (
        <div className="download-complete">
          ✅ Ready to play!
        </div>
      )}

      {downloadState.status.includes('failed') && (
        <button
          onClick={handleRetry}
          className="retry-button"
        >
          Retry Download
        </button>
      )}

      <div className="download-note">
        This may take a few minutes depending on your connection speed.
      </div>
    </div>
  );
}

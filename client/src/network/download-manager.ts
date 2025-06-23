import SpriteBuffer from "../renderer/sprite-buffer";

export interface DownloadProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentFile: string;
}

export class DownloadManager {
  private progressCallback: ((progress: DownloadProgress) => void) | null = null;
  private totalSize: number = 0;
  private loadedSize: number = 0;
  private currentFile: string = '';

  constructor() {}

  public setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  public async downloadFile(url: string, filename: string): Promise<ArrayBuffer> {
    this.currentFile = filename;
    this.loadedSize = 0;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${filename}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      this.totalSize = parseInt(contentLength, 10);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error(`Failed to get reader for ${filename}`);
    }

    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      this.loadedSize += value.length;
      
      if (this.progressCallback) {
        this.progressCallback({
          total: this.totalSize,
          loaded: this.loadedSize,
          percentage: (this.loadedSize / this.totalSize) * 100,
          currentFile: this.currentFile
        });
      }
    }

    return new Blob(chunks).arrayBuffer();
  }

  public async downloadFiles(urls: { url: string; filename: string }[]): Promise<Map<string, ArrayBuffer>> {
    const results = new Map<string, ArrayBuffer>();
    
    for (const { url, filename } of urls) {
      try {
        const data = await this.downloadFile(url, filename);
        results.set(filename, data);
      } catch (error) {
        console.error(`Error downloading ${filename}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  public async loadGameAssetsWithUI(onComplete?: () => void): Promise<void> {
    const progressElement = document.getElementById('download-progress');
    const progressBar = document.getElementById('download-progress-bar');
    const statusElement = document.getElementById('download-status');
  
    if (progressElement) progressElement.style.display = 'block';
  
    this.setProgressCallback((progress: DownloadProgress) => {
      if (progressBar) progressBar.style.width = `${progress.percentage}%`;
      if (statusElement) {
        const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (progress.total / (1024 * 1024)).toFixed(1);
        statusElement.textContent = `${progress.currentFile}: ${loadedMB}MB / ${totalMB}MB (${Math.round(progress.percentage)}%)`;
      }
    });
  
    const files = [
      { url: `/data/sprites/Tibia.spr`, filename: "Tibia.spr" },
      { url: `/data/sprites/Tibia.dat`, filename: "Tibia.dat" },
    ];
  
    try {
      const results = await this.downloadFiles(files);
      if (progressElement) progressElement.style.display = 'none';
  
      const datData = results.get("Tibia.dat");
      const sprData = results.get("Tibia.spr");
  
      if (datData && sprData) {
        window.gameClient.dataObjects.load("Tibia.dat", {
          target: { result: datData }
        } as unknown as ProgressEvent<FileReader>);
      
        SpriteBuffer.load("Tibia.spr", {
          target: { result: sprData }
        } as unknown as ProgressEvent<FileReader>);
      
        if (onComplete) onComplete(); 
      }
    } catch (error: any) {
      if (progressElement) progressElement.style.display = 'none';
      console.error('Asset loading error:', error);
  
      window.gameClient.interface.modalManager.open("floater-connecting", {
        message: `Failed loading client data: ${error.message}. Please try again or select files manually using the Load Assets button.`,
      });
    }
  }
  
}
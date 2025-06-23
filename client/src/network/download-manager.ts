import SpriteBuffer from "../renderer/sprite-buffer";

export interface DownloadProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentFile: string;
}

export interface DownloadFile {
  url: string;
  filename: string;
}

export interface UIElements {
  progressElement: HTMLElement | null;
  progressBar: HTMLElement | null;
  statusElement: HTMLElement | null;
}

export class DownloadManager {
  private progressCallback: ((progress: DownloadProgress) => void) | null = null;
  private totalSize: number = 0;
  private loadedSize: number = 0;
  private currentFile: string = '';

  private readonly ui: UIElements;
  private readonly gameAssets: DownloadFile[] = [
    { url: '/data/sprites/Tibia.spr', filename: 'Tibia.spr' },
    { url: '/data/sprites/Tibia.dat', filename: 'Tibia.dat' }
  ];

  constructor() {
    this.ui = {
      progressElement: document.getElementById('download-progress'),
      progressBar: document.getElementById('download-progress-bar'),
      statusElement: document.getElementById('download-status')
    };
  }

  public setProgressCallback(callback: (progress: DownloadProgress) => void): void {
    this.progressCallback = callback;
  }

  public async downloadFile(url: string, filename: string): Promise<ArrayBuffer> {
    this.currentFile = filename;
    this.loadedSize = 0;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.setTotalSize(response);
      return await this.readResponseStream(response);
    } catch (error) {
      throw new Error(`Failed to download ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async downloadFiles(files: DownloadFile[]): Promise<Map<string, ArrayBuffer>> {
    const results = new Map<string, ArrayBuffer>();
    
    for (const file of files) {
      try {
        const data = await this.downloadFile(file.url, file.filename);
        results.set(file.filename, data);
      } catch (error) {
        console.error(`Error downloading ${file.filename}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  public async loadGameAssetsWithUI(onComplete?: () => void): Promise<void> {
    this.showProgressUI();
    this.setupProgressCallback();

    try {
      const results = await this.downloadFiles(this.gameAssets);
      this.hideProgressUI();
      await this.processDownloadedAssets(results);
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      this.hideProgressUI();
      this.handleAssetLoadingError(error);
    }
  }

  private setTotalSize(response: Response): void {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      this.totalSize = parseInt(contentLength, 10);
    }
  }

  private async readResponseStream(response: Response): Promise<ArrayBuffer> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        this.loadedSize += value.length;
        this.updateProgress();
      }
    } finally {
      reader.releaseLock();
    }

    return new Blob(chunks).arrayBuffer();
  }

  private updateProgress(): void {
    if (this.progressCallback && this.totalSize > 0) {
      this.progressCallback({
        total: this.totalSize,
        loaded: this.loadedSize,
        percentage: (this.loadedSize / this.totalSize) * 100,
        currentFile: this.currentFile
      });
    }
  }

  private showProgressUI(): void {
    if (this.ui.progressElement) {
      this.ui.progressElement.style.display = 'block';
    }
  }

  private hideProgressUI(): void {
    if (this.ui.progressElement) {
      this.ui.progressElement.style.display = 'none';
    }
  }

  private setupProgressCallback(): void {
    this.setProgressCallback((progress: DownloadProgress) => {
      this.updateProgressBar(progress);
      this.updateStatusText(progress);
    });
  }

  private updateProgressBar(progress: DownloadProgress): void {
    if (this.ui.progressBar) {
      this.ui.progressBar.style.width = `${progress.percentage}%`;
    }
  }

  private updateStatusText(progress: DownloadProgress): void {
    if (this.ui.statusElement) {
      const loadedMB = (progress.loaded / (1024 * 1024)).toFixed(1);
      const totalMB = (progress.total / (1024 * 1024)).toFixed(1);
      this.ui.statusElement.textContent = 
        `${progress.currentFile}: ${loadedMB}MB / ${totalMB}MB (${Math.round(progress.percentage)}%)`;
    }
  }

  private async processDownloadedAssets(results: Map<string, ArrayBuffer>): Promise<void> {
    const datData = results.get('Tibia.dat');
    const sprData = results.get('Tibia.spr');

    if (!datData || !sprData) {
      throw new Error('Missing required game assets');
    }

    await this.loadDataFile(datData);
    await this.loadSpriteFile(sprData);
  }

  private async loadDataFile(datData: ArrayBuffer): Promise<void> {
    window.gameClient.dataObjects.load('Tibia.dat', {
      target: { result: datData }
    } as unknown as ProgressEvent<FileReader>);
  }

  private async loadSpriteFile(sprData: ArrayBuffer): Promise<void> {
    SpriteBuffer.load('Tibia.spr', {
      target: { result: sprData }
    } as unknown as ProgressEvent<FileReader>);
  }

  private handleAssetLoadingError(error: unknown): void {
    console.error('Asset loading error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    window.gameClient.interface.modalManager.open('floater-connecting', {
      message: `Failed loading client data: ${errorMessage}. Please try again or select files manually using the Load Assets button.`
    });
  }
}
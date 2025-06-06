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
}
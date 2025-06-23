import SpriteBuffer from "../renderer/sprite-buffer";

interface MinimapChunk {
  imageData: ImageData;
  view: Uint32Array;
}

interface Position3D {
  x: number;
  y: number;
  z: number;
}

interface StoredFile {
  filename: string;
  data: any;
}

interface FileVersions {
  [filename: string]: string;
}

interface VersionInfo {
  version: string;
}

export default class Database {
  private database: IDBDatabase | null = null;
  private readonly minimapChunkSize: number = 128;
  private loadedMinimapChunks: { [id: string]: MinimapChunk } = {};
  
  // Constants from process.env
  private readonly DATABASE_NAME = process.env.DATABASE_NAME!;
  private readonly DATABASE_VERSION = parseInt(process.env.DATABASE_VERSION!, 10);
  private readonly MINIMAP_STORE = "minimap";
  private readonly FILES_STORE = "files";
  private readonly FILE_VERSIONS_KEY = process.env.FILE_VERSIONS_KEY!;
  private readonly REQUIRED_FILES = process.env.REQUIRED_FILES!.split(',').map(s => s.trim());

  constructor() {
    this.initializeDatabase();
    this.updateClientVersion();
  }

  // Database Initialization
  public initializeDatabase(): void {
    const openRequest: IDBOpenDBRequest = indexedDB.open(this.DATABASE_NAME, this.DATABASE_VERSION);
    openRequest.onerror = (event: Event) => this.handleDatabaseOpenError(event);
    openRequest.onsuccess = (event: Event) => this.handleDatabaseOpenSuccess(event);
    openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => this.handleDatabaseUpgrade(event);
  }

  public clearDatabase(): void {
    if (!confirm("Are you sure you want to reset the client?")) {
      return;
    }
    localStorage.clear();
    indexedDB.deleteDatabase(this.DATABASE_NAME);
    window.location.reload();
  }

  // Database Transactions
  private createTransaction(store: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.database) {
      throw new Error("Database not initialized.");
    }
    return this.database.transaction(store, mode).objectStore(store);
  }

  // Asset Management
  public async loadGameConstants(): Promise<any> {
    const response = await fetch(`/data/sprites/constants.json`);
    return await response.json();
  }

  public async initializeGameAssets(): Promise<void> {
    const constants = await this.loadGameConstants();
    (window as any).CONST = constants;
    
    if (await this.areAssetsUpToDate()) {
      this.loadCachedGameAssets();
    }
  }

  public async areAssetsUpToDate(): Promise<boolean> {
    const needsUpdate = await this.checkFileVersions();
    const hasRequiredFiles = this.REQUIRED_FILES.every(file => localStorage.getItem(file));
    return hasRequiredFiles && !needsUpdate;
  }

  public storeGameFile(filename: string, data: any): void {
    console.log("Storing file:", filename);
    localStorage.setItem(filename, "true");

    // Store version info for SPR files
    if (filename === 'Tibia.spr') {
      this.updateSpriteFileVersion();
    }

    const fileStore = this.createTransaction(this.FILES_STORE, "readwrite");
    const request = fileStore.put({
      filename: filename,
      data: data,
    });
    request.onsuccess = (): void => {
      console.debug(`Cached file ${filename} to IndexedDB.`);
    };
  }

  // Minimap Management
  public saveAllMinimapChunks(): void {
    Object.keys(this.loadedMinimapChunks).forEach((id: string) => {
      this.saveMinimapChunk(id);
    });
  }

  public preloadMinimapChunks(
    positions: Position3D[],
    callback: (chunks: { [id: string]: MinimapChunk }) => void
  ): void {
    const validPositions = positions.filter(this.isValidMinimapPosition.bind(this));

    let loadedCount = 0;
    const onChunkLoaded = (): void => {
      if (++loadedCount === validPositions.length) {
        callback(this.getLoadedMinimapChunks());
      }
    };

    validPositions.forEach((position) => {
      this.loadMinimapChunk(this.getMinimapChunkId(position), onChunkLoaded);
    });
  }

  public isValidMinimapPosition(position: Position3D): boolean {
    return position.x >= 0 && position.y >= 0 && position.z >= 0;
  }

  public getMinimapChunkId(position: Position3D): string {
    const xChunk = Math.floor(position.x / this.minimapChunkSize);
    const yChunk = Math.floor(position.y / this.minimapChunkSize);
    return `${xChunk}.${yChunk}.${position.z}`;
  }

  public getLoadedMinimapChunks(): { [id: string]: MinimapChunk } {
    return this.loadedMinimapChunks;
  }

  public loadMinimapChunk(id: string, callback: () => void): void {
    if (this.loadedMinimapChunks.hasOwnProperty(id)) {
      return callback();
    }

    const request = this.createTransaction(this.MINIMAP_STORE, "readonly").get(id);
    request.onsuccess = (event: Event): void => {
      const target = event.target as IDBRequest;
      if (target.result === undefined) {
        this.loadedMinimapChunks[id] = this.createMinimapChunkView(this.createEmptyMinimapChunk());
      } else {
        this.loadedMinimapChunks[id] = this.createMinimapChunkView(target.result.data);
      }
      callback();
    };
  }

  public cleanupDistantMinimapChunks(position: Position3D): void {
    const currentChunkId = this.getMinimapChunkId(position);
    const [currentX, currentY, currentZ] = currentChunkId.split(".").map(Number);
    
    Object.keys(this.loadedMinimapChunks).forEach((chunkId: string) => {
      const [x, y, z] = chunkId.split(".").map(Number);
      if (Math.abs(currentX - x) > 2 || Math.abs(currentY - y) > 2 || currentZ !== z) {
        delete this.loadedMinimapChunks[chunkId];
      }
    });
  }

  public saveMinimapChunksForCurrentLevel(): void {
    const playerZ = window.gameClient.player!.getPosition().z;
    Object.keys(this.loadedMinimapChunks).forEach((id: string) => {
      const [, , z] = id.split(".").map(Number);
      if (playerZ !== z) {
        this.saveMinimapChunk(id);
      }
    });
  }

  // Private Helper Methods
  private handleDatabaseUpgrade(event: IDBVersionChangeEvent): void {
    console.debug("Initializing IndexedDB with new version.");
    this.database = (event.target as IDBOpenDBRequest).result;
    this.createDatabaseStores();
  }
  
  private handleDatabaseOpenError(event: Event): void {
    const target = event.target as IDBOpenDBRequest;
    console.error("Database open error:", target.error);
  }

  private handleDatabaseOpenSuccess(event: Event): void {
    console.debug("Successfully initialized IndexedDB.");
    this.database = (event.target as IDBOpenDBRequest).result;
    this.initializeGameAssets();
  }

  private createDatabaseStores(): void {
    if (!this.database!.objectStoreNames.contains(this.MINIMAP_STORE)) {
      const objectStore = this.database!.createObjectStore(this.MINIMAP_STORE, { keyPath: "chunk" });
      objectStore.createIndex("id", "chunk");
    }
  
    if (!this.database!.objectStoreNames.contains(this.FILES_STORE)) {
      const fileStore = this.database!.createObjectStore(this.FILES_STORE, { keyPath: "filename" });
      fileStore.createIndex("id", "filename");
    }
  }

  private createMinimapChunkView(chunk: ImageData): MinimapChunk {
    return {
      imageData: chunk,
      view: new Uint32Array(chunk.data.buffer),
    };
  }

  private createEmptyMinimapChunk(): ImageData {
    const size = 4 * this.minimapChunkSize * this.minimapChunkSize;
    return new ImageData(new Uint8ClampedArray(size), this.minimapChunkSize, this.minimapChunkSize);
  }

  private loadCachedGameAssets(): void {
    this.createTransaction(this.FILES_STORE, "readonly").getAll().onsuccess = (event: Event): void => {
      const target = event.target as IDBRequest;
      if (target.result.length === 0) {
        return;
      }
      
      target.result.forEach((file: StoredFile) => {
        this.loadGameFile(file);
      });
    };
  }

  private loadGameFile(file: StoredFile): void {
    switch (file.filename) {
      case "Tibia.dat":
        window.gameClient.dataObjects.__load(file.filename, file.data);
        break;
      case "Tibia.spr":
        SpriteBuffer.load(file.filename, file.data);
        break;
      default:
        console.warn(`Unknown file type: ${file.filename}`);
    }
  }

  private saveMinimapChunk(id: string): void {
    const minimapStore = this.createTransaction(this.MINIMAP_STORE, "readwrite");
    const request = minimapStore.put({
      chunk: id,
      data: this.loadedMinimapChunks[id].imageData,
    });
    request.onsuccess = (): void => {
      delete this.loadedMinimapChunks[id];
    };
  }

  private async checkFileVersions(): Promise<boolean> {
    try {
      const serverVersions = await this.fetchServerFileVersions();
      const localVersions = this.getLocalFileVersions();
      
      const needsUpdate = this.compareFileVersions(serverVersions, localVersions);

      if (needsUpdate) {
        console.log('Game files need updating');
        this.clearCachedFiles();
        this.updateLocalFileVersions(serverVersions);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking file versions:', error);
      return false;
    }
  }

  private async fetchServerFileVersions(): Promise<FileVersions> {
    try {
      // Try to fetch the main version file first
      const response = await fetch('/data/sprites/version.json');
      
      if (!response.ok) {
        console.debug('Version file not found at /data/sprites/version.json, skipping version check');
        return {};
      }
      
      const versionInfo: VersionInfo = await response.json();
      
      // Create a simple version mapping based on the main version
      // This assumes all files are at the same version
      const fileVersions: FileVersions = {};
      this.REQUIRED_FILES.forEach(filename => {
        fileVersions[filename] = versionInfo.version;
      });
      
      return fileVersions;
    } catch (error) {
      console.debug('Could not fetch server file versions, skipping version check:', error);
      return {};
    }
  }

  private getLocalFileVersions(): FileVersions {
    return JSON.parse(localStorage.getItem(this.FILE_VERSIONS_KEY) || '{}');
  }

  private compareFileVersions(serverVersions: FileVersions, localVersions: FileVersions): boolean {
    return Object.entries(serverVersions).some(([filename, version]) => {
      return !localVersions[filename] || localVersions[filename] !== version;
    });
  }

  private clearCachedFiles(): void {
    this.REQUIRED_FILES.forEach(file => localStorage.removeItem(file));
  }

  private updateLocalFileVersions(versions: FileVersions): void {
    localStorage.setItem(this.FILE_VERSIONS_KEY, JSON.stringify(versions));
  }

  private async updateSpriteFileVersion(): Promise<void> {
    try {
      const response = await fetch('/data/sprites/version.json');
      if (!response.ok) {
        console.debug('Version file not available, skipping SPR version update');
        return;
      }
      const versionInfo: VersionInfo = await response.json();
      localStorage.setItem('spr_version', versionInfo.version);
    } catch (error) {
      console.debug('Error updating SPR file version:', error);
    }
  }

  private async updateClientVersion(): Promise<void> {
    try {
      const response = await fetch('/data/sprites/version.json');
      if (!response.ok) {
        console.debug('Version file not available, skipping client version update');
        return;
      }
      const versionInfo: VersionInfo = await response.json();
      const versionElement = document.getElementById("client-version");
      if (versionElement) {
        versionElement.innerHTML = versionInfo.version;
      }
    } catch (error) {
      console.debug('Error updating client version:', error);
    }
  }
}

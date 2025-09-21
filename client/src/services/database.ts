import AssetManager from "./asset-manager";


interface MinimapChunk {
  imageData: ImageData;
  view: Uint32Array;
}

interface Position3D {
  x: number;
  y: number;
  z: number;
}

export default class Database {
  private database: IDBDatabase | null = null;
  private readonly minimapChunkSize: number = 128;
  private loadedMinimapChunks: { [id: string]: MinimapChunk } = {};
  private assetManager: AssetManager;
  
  // Constants from process.env
  private readonly DATABASE_NAME = process.env.DATABASE_NAME!;
  private readonly DATABASE_VERSION = parseInt(process.env.DATABASE_VERSION!, 10);
  private readonly MINIMAP_STORE = "minimap";
  private readonly FILES_STORE = "files";

  constructor() {
    this.assetManager = new AssetManager();
    this.initializeDatabase();
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
    return await this.assetManager.loadGameConstants();
  }

  public async initializeGameAssets(): Promise<void> {
    await this.assetManager.initializeGameAssets();
    
    if (await this.assetManager.areAssetsUpToDate()) {
      this.assetManager.loadCachedGameAssets(this);
    }
  }

  public storeGameFile(filename: string, data: any): void {
    this.assetManager.storeGameFile(filename, data, this);
  }

  public async areAssetsUpToDate(): Promise<boolean> {
    return await this.assetManager.areAssetsUpToDate();
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

  public saveMinimapChunk(id: string): void {
    const minimapStore = this.createTransaction(this.MINIMAP_STORE, "readwrite");
    const request = minimapStore.put({
      chunk: id,
      data: this.loadedMinimapChunks[id].imageData,
    });
    request.onsuccess = (): void => {
      delete this.loadedMinimapChunks[id];
    };
  }
} 
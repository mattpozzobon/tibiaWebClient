import SpriteBuffer from "../renderer/sprite-buffer";

export default class Database {
 
  private __database: IDBDatabase | null;
  private __minimapChunkSize: number;
  private __loadedMinimapChunks: { [id: string]: { imageData: ImageData; view: Uint32Array } };
  private readonly ASSET_BASE = "https://pub-731c9162b7da4ead9743fb831880fd77.r2.dev/data/sprites";
  private readonly FILE_VERSIONS_KEY = 'file_versions';
  private readonly VERSION_CHECK_URL = `${this.ASSET_BASE}/version.json`;

  constructor() {
    this.__database = null;
    this.__minimapChunkSize = 128;
    this.__loadedMinimapChunks = {};
    this.init();
    this.updateClientVersion();
  }

  public init(): void {
    const VERSION = 1098;
    const openRequest: IDBOpenDBRequest = indexedDB.open("game", VERSION);
    openRequest.onerror = (event: Event) => this.__handleOpenError(event);
    openRequest.onsuccess = (event: Event) => this.__handleOpenSuccess(event);
    openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => this.__handleUpgrade(event);
  }

  public clear(): void {
    if (!confirm("Are you sure you want to reset the client?")) {
      return;
    }
    localStorage.clear();
    indexedDB.deleteDatabase("game");
    window.location.reload();
  }

  public transaction(store: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.__database) {
      throw new Error("Database not initialized.");
    }
    return this.__database.transaction(store, mode).objectStore(store);
  }

  public saveChunks(): void {
    Object.keys(this.__loadedMinimapChunks).forEach((id: string) => {
      this.__saveChunk(id);
    });
  }

  public preloadCallback(
    positions: { x: number; y: number; z: number }[],
    callback: (chunks: { [id: string]: { imageData: ImageData; view: Uint32Array } }) => void
  ): void {
    positions = positions.filter(this.isValidMinimapChunk.bind(this));

    let count = 0;
    const finishCallback = (): void => {
      if (++count === positions.length) {
        return callback(this.getLoadedMinimapChunks());
      }
    };

    positions.forEach((position) => {
      this.loadChunk(this.getChunkIdentifier(position), finishCallback);
    });
  }

  public isValidMinimapChunk(position: { x: number; y: number; z: number }): boolean {
    return position.x >= 0 && position.y >= 0 && position.z >= 0;
  }

  public getChunkIdentifier(position: { x: number; y: number; z: number }): string {
    const xChunk = Math.floor(position.x / this.__minimapChunkSize);
    const yChunk = Math.floor(position.y / this.__minimapChunkSize);
    return `${xChunk}.${yChunk}.${position.z}`;
  }

  public getLoadedMinimapChunks(): { [id: string]: { imageData: ImageData; view: Uint32Array } } {
    return this.__loadedMinimapChunks;
  }

  public loadChunk(id: string, callback: () => void): void {
    if (this.__loadedMinimapChunks.hasOwnProperty(id)) {
      return callback();
    }
    const request = this.transaction("minimap", "readonly").get(id);
    request.onsuccess = (event: Event): void => {
      const target = event.target as IDBRequest;
      if (target.result === undefined) {
        this.__loadedMinimapChunks[id] = this.__createView(this.__createChunk());
      } else {
        this.__loadedMinimapChunks[id] = this.__createView(target.result.data);
      }
      callback();
    };
  }

  public storeFile(filename: string, data: any): void {
    console.log("filename", filename);
    localStorage.setItem(filename, "true");

    // If storing SPR file, also store its version
    if (filename === 'Tibia.spr') {
      fetch(this.VERSION_CHECK_URL)
        .then(response => response.json())
        .then(version => {
          localStorage.setItem('spr_version', version.version);
        })
        .catch(error => {
          console.error('Error storing SPR version:', error);
        });
    }

    const fileStore = this.transaction("files", "readwrite");
    const request = fileStore.put({
      filename: filename,
      data: data,
    });
    request.onsuccess = (event: Event): void => {
      console.debug("Cached file " + filename + " to indexDB.");
    };
  }

  public async loadConstants(): Promise<any> {
    const response = await fetch(`/data/sprites/constants.json`);
    return await response.json();
  }

  public loadGameAssets(): void {
    this.loadConstants().then(async (constants: any) => {
      (window as any).CONST = constants;
      
      // Check if SPR needs updating
      const needsUpdate = await this.__checkSprVersion();
      
      if (!localStorage.getItem("Tibia.spr") || !localStorage.getItem("Tibia.dat") || needsUpdate) {
        return window.gameClient.networkManager.loadGameFilesServer();
      }
      this.__loadGameAssets();
    });
  }

  private __handleUpgrade(event: IDBVersionChangeEvent): void {
    console.debug("Initializing IndexedDB with new version.");
  
    // Set the database; event.target is an IDBOpenDBRequest.
    this.__database = (event.target as IDBOpenDBRequest).result;
  
    // Check if stores exist before creating them
    if (!this.__database.objectStoreNames.contains("minimap")) {
      const objectStore = this.__database.createObjectStore("minimap", { keyPath: "chunk" });
      objectStore.createIndex("id", "chunk");
    }
  
    if (!this.__database.objectStoreNames.contains("files")) {
      const fileStore = this.__database.createObjectStore("files", { keyPath: "filename" });
      fileStore.createIndex("id", "filename");
    }
  }
  
  private __handleOpenError(event: Event): void {
    const target = event.target as IDBOpenDBRequest;
    console.error("Error", target.error);
  }

  private __handleOpenSuccess(event: Event): void {
    console.debug("Successfully initialized IndexedDB.");
    this.__database = (event.target as IDBOpenDBRequest).result;
    this.loadGameAssets();
  }

  private __createView(chunk: ImageData): { imageData: ImageData; view: Uint32Array } {
    return {
      imageData: chunk,
      view: new Uint32Array(chunk.data.buffer),
    };
  }

  private __createChunk(): ImageData {
    const size = 4 * this.__minimapChunkSize * this.__minimapChunkSize;
    return new ImageData(new Uint8ClampedArray(size), this.__minimapChunkSize, this.__minimapChunkSize);
  }

  private __loadGameAssets(): void {
    this.transaction("files", "readonly").getAll().onsuccess = (event: Event): void => {
      const target = event.target as IDBRequest;
      if (target.result.length === 0) {
        return;
      }
      target.result.forEach((file: any) => {
        switch (file.filename) {
          case "Tibia.dat":
            return window.gameClient.dataObjects.__load(file.filename, file.data);
          case "Tibia.spr":
            return SpriteBuffer.load(file.filename, file.data);
          default:
            return;
        }
      });
    };
  }

  public dropWorldMapChunks(position: { x: number; y: number; z: number }): void {
    const id = this.getChunkIdentifier(position);
    const [rx, ry, rz] = id.split(".").map(Number);
    Object.keys(this.__loadedMinimapChunks).forEach((chunkId: string) => {
      const [x, y, z] = chunkId.split(".").map(Number);
      if (Math.abs(rx - x) > 2 || Math.abs(ry - y) > 2 || rz !== z) {
        delete this.__loadedMinimapChunks[chunkId];
      }
    });
  }

  public checkChunks(): void {
    Object.keys(this.__loadedMinimapChunks).forEach((id: string) => {
      const [x, y, z] = id.split(".").map(Number);
      if (window.gameClient.player!.getPosition().z !== z) {
        this.__saveChunk(id);
      }
    });
  }

  private __saveChunk(id: string): void {
    const minimapStore = this.transaction("minimap", "readwrite");
    const request = minimapStore.put({
      chunk: id,
      data: this.__loadedMinimapChunks[id].imageData,
    });
    request.onsuccess = (): void => {
      delete this.__loadedMinimapChunks[id];
    };
  }

  private async __checkFileVersions(): Promise<boolean> {
    try {
      // Get server file versions
      const response = await fetch(`/data/${window.gameClient.SERVER_VERSION}/file_versions.json`);
      const serverVersions = await response.json();
      
      // Get local file versions
      const localVersions = JSON.parse(localStorage.getItem(this.FILE_VERSIONS_KEY) || '{}');
      
      // Check if files need updating
      const needsUpdate = Object.entries(serverVersions).some(([filename, version]) => {
        return !localVersions[filename] || localVersions[filename] !== version;
      });

      if (needsUpdate) {
        console.log('Game files need updating');
        // Clear old files
        localStorage.removeItem('Tibia.spr');
        localStorage.removeItem('Tibia.dat');
        // Update version info
        localStorage.setItem(this.FILE_VERSIONS_KEY, JSON.stringify(serverVersions));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking file versions:', error);
      return false;
    }
  }

  private async __checkSprVersion(): Promise<boolean> {
    try {
      // Get server version info
      const response = await fetch(this.VERSION_CHECK_URL);
      const serverInfo = await response.json();
      
      // Get local version
      const localVersion = localStorage.getItem('spr_version');
      
      // If versions don't match or no local version exists
      if (!localVersion || localVersion !== serverInfo.version) {
        console.log('SPR file needs updating - version changed');
        // Clear old SPR file
        localStorage.removeItem('Tibia.spr');
        // Update version
        localStorage.setItem('spr_version', serverInfo.version);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking SPR version:', error);
      return false;
    }
  }

  private async updateClientVersion(): Promise<void> {
    try {
      const response = await fetch(this.VERSION_CHECK_URL);
      const versionInfo = await response.json();
      const versionElement = document.getElementById("client-version");
      if (versionElement) {
        versionElement.innerHTML = versionInfo.version;
      }
    } catch (error) {
      console.error('Error updating client version:', error);
    }
  }
}

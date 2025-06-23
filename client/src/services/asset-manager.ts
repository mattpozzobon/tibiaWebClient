import SpriteBuffer from "../renderer/sprite-buffer";

interface FileVersions {
  [filename: string]: string;
}

interface VersionInfo {
  version: string;
}

interface StoredFile {
  filename: string;
  data: any;
}

export default class AssetManager {
  private readonly FILE_VERSIONS_KEY = process.env.FILE_VERSIONS_KEY!;
  private readonly REQUIRED_FILES = process.env.REQUIRED_FILES!.split(',').map(s => s.trim());

  constructor() {
    this.updateClientVersion();
  }

  // Asset Version Management
  public async areAssetsUpToDate(): Promise<boolean> {
    const needsUpdate = await this.checkFileVersions();
    const hasRequiredFiles = this.REQUIRED_FILES.every(file => localStorage.getItem(file));
    return hasRequiredFiles && !needsUpdate;
  }

  public async checkFileVersions(): Promise<boolean> {
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

  // Game File Loading
  public async loadGameConstants(): Promise<any> {
    const response = await fetch(`/data/sprites/constants.json`);
    return await response.json();
  }

  public async initializeGameAssets(): Promise<void> {
    const constants = await this.loadGameConstants();
    (window as any).CONST = constants;
  }

  public loadCachedGameAssets(database: any): void {
    database.createTransaction("files", "readonly").getAll().onsuccess = (event: Event): void => {
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

  public storeGameFile(filename: string, data: any, database: any): void {
    console.log("Storing file:", filename);
    localStorage.setItem(filename, "true");

    // Store version info for SPR files
    if (filename === 'Tibia.spr') {
      this.updateSpriteFileVersion();
    }

    const fileStore = database.createTransaction("files", "readwrite");
    const request = fileStore.put({
      filename: filename,
      data: data,
    });
    request.onsuccess = (): void => {
      console.debug(`Cached file ${filename} to IndexedDB.`);
    };
  }

  // Version Updates
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
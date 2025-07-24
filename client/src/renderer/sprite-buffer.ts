import Outfit from "../game/outfit";
import Position from "../game/position";
import PacketReader from "../network/packetreader";
import { CanvasSource, Rectangle, SCALE_MODES, Texture, WRAP_MODES } from "pixi.js";

export default class SpriteBuffer {
  private size: number;
  private bufferIndex = 0;
  private idToIndex = new Map<number, number>();
  private textures: (Texture | null)[];
  private atlasCanvas: HTMLCanvasElement;
  private atlasCtx: CanvasRenderingContext2D;
  private atlasSource: CanvasSource;
  private scratch: ImageData;

  public nEvictions = 0;
  public decodeCount = 0;
  public hitCount = 0;
  public missCount = 0;

  public static __version: number | null = null;
  private static __globalPacket: PacketReader | null = null;
  private static __addresses: Record<number, number> = {};
  static SIGNATURES: Record<string, number> = {"57BBD603": 1098};

  constructor(totalSprites: number) {
    // 0) Force nearest‐neighbor and clamp globally
    //PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    // (Wrap mode is per‐texture below)

    // Compute grid size
    this.size = Math.ceil(Math.sqrt(totalSprites));

    // Cell size = 32px sprite + 2px padding (1px border each side)
    const cell = 32 + 2;

    // Create raw canvas
    this.atlasCanvas = document.createElement("canvas");
    this.atlasCanvas.width  = this.size * cell;
    this.atlasCanvas.height = this.size * cell;
    this.atlasCtx = this.atlasCanvas.getContext("2d")!;

    // Prepare CanvasSource (for v8)
    this.atlasSource = new CanvasSource({ resource: this.atlasCanvas });
    // Clamp to edge so UVs don't wrap
    this.atlasSource = new CanvasSource({
      resource: this.atlasCanvas,
    
      // pixel‐perfect sampling
      minFilter: SCALE_MODES.NEAREST,
      magFilter: SCALE_MODES.NEAREST,
      mipmapFilter: SCALE_MODES.NEAREST,
      wrapMode: WRAP_MODES.CLAMP
    });

    // Prepare texture slots and scratch buffer
    this.textures = new Array(this.size * this.size).fill(null);
    this.scratch  = new ImageData(32, 32);
  }

  /** Load and parse the global .spr file just once */
  static load(name: string, data: ArrayBuffer | ProgressEvent<FileReader>): void {
    try {
      let buf: ArrayBuffer;
      if (data instanceof ArrayBuffer) buf = data;
      else {
        const result = (data.target as FileReader).result;
        if (!(result instanceof ArrayBuffer)) throw new Error("Not ArrayBuffer");
        buf = result;
        window.gameClient.database.storeGameFile(name, buf);
      }
      this.__globalPacket = new PacketReader(buf);
      const sig = this.__globalPacket.readUInt32().toString(16).toUpperCase();
      if (!(sig in this.SIGNATURES)) throw new Error("Unknown .spr");
      this.__version = this.SIGNATURES[sig];
      const count =
        this.__version > 760
          ? this.__globalPacket.readUInt32()
          : this.__globalPacket.readUInt16();
      for (let i = 1; i <= count; i++) {
        const addr = this.__globalPacket.readUInt32();
        if (addr !== 0) this.__addresses[i] = addr;
      }
      window.gameClient.interface.loadAssetCallback("sprite", name);
    } catch (e) {
      window.gameClient.interface.modalManager.open("floater-connecting", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /** Clear all cached sprites and reset atlas */
  clear(): void {
    this.bufferIndex = 0;
    this.idToIndex.clear();
    this.textures.fill(null);
    this.atlasCtx.clearRect(0, 0, this.atlasCanvas.width, this.atlasCanvas.height);
  }

  /** Check if a sprite is already cached */
  has(id: number): boolean {
    return this.idToIndex.has(id);
  }

  /** Get or load a Texture for the given sprite ID */
  get(id: number): Texture | null {
    if (id === 0) return null;
    if (this.has(id)) {
      this.hitCount++;
      return this.textures[this.idToIndex.get(id)!]!;
    } else {
      this.missCount++;
      return this.add(id);
    }
  }

  /** Reserve an atlas cell, evicting old texture if needed (O(1)) */
  private reserveCell(id: number): number {
    const idx = this.bufferIndex;
    this.evict(idx);
    this.idToIndex.set(id, idx);
    this.bufferIndex = (idx + 1) % this.textures.length;
    return idx;
  }

  /** Evict a texture from an atlas cell and free GPU memory */
  private evict(idx: number): void {
    const old = this.textures[idx];
    if (!old) return;
    old.destroy();                                             // :contentReference[oaicite:12]{index=12}
    this.textures[idx] = null;
    for (const [key, val] of this.idToIndex) {
      if (val === idx) { this.idToIndex.delete(key); break; }
    }
    this.nEvictions++;
  }

  /** Decode sprite data into the scratch ImageData and return it */
  private decodeSprite(id: number): ImageData {
    this.decodeCount++;
    const pkt = SpriteBuffer.__globalPacket!;
    const addr = SpriteBuffer.__addresses[id];
    const len = pkt.buffer[addr + 3] + (pkt.buffer[addr + 4] << 8);
    const slice = pkt.slice(addr, addr + 5 + len);
    slice.readRGB();
    slice.skip(2);

    const buf32 = new Uint32Array(this.scratch.data.buffer);
    buf32.fill(0);
    let ptr = 0;
    while (slice.readable()) {
      const skip = slice.readUInt16();
      const run  = slice.readUInt16();
      ptr += skip;
      for (let i = ptr; i < ptr + run; i++) {
        const r = slice.readUInt8();
        const g = slice.readUInt8();
        const b = slice.readUInt8();
        const a = slice.readUInt8();
        buf32[i] = (a << 24) | (b << 16) | (g << 8) | r;
      }
      ptr += run;
    }
    return this.scratch;
  }

  /** Add a sprite into the atlas and return its Texture */
  private add(id: number): Texture {
    // Reserve a cell and decode into scratch
    const cell = this.reserveCell(id);
    const img  = this.decodeSprite(id);

    const cellSize = 32 + 2;
    const col = cell % this.size;
    const row = Math.floor(cell / this.size);

    // Draw with 1px inset padding
    const x = col * cellSize + 1;
    const y = row * cellSize + 1;
    this.atlasCtx.putImageData(img, x, y);

    // Upload only changed atlas region
    this.atlasSource.update();

    // Create a 32×32 sub‐texture at the padded location
    const frame = new Rectangle(x, y, 32, 32);
    const tex   = new Texture({ source: this.atlasSource, frame, orig: frame });
    tex.updateUvs();

    this.textures[cell] = tex;
    return tex;
  }

  /** Compute the world position (in atlas cells) of a sprite ID */
  getSpritePosition(id: number): Position | null {
    const idx = this.idToIndex.get(id);
    if (idx == null) return null;
    return new Position(idx % this.size, Math.floor(idx / this.size), 0);
  }

  getAtlasFillInfo(): string {
    return `${this.idToIndex.size} / ${this.textures.length} (${(100 * this.idToIndex.size / this.textures.length).toFixed(1)}%)`;
  }

  // ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  static getComposedKey(
    outfit: Outfit,
    item: any,
    frame: number,
    xPattern: number,
    yPattern: number,
    zPattern: number,
    x: number,
    y: number
  ): number {
    // Deterministic composite key for caching
    return (
      ((outfit.id & 0xFFFF) << 16) ^
      ((item.id & 0xFFFF) << 0) ^
      ((frame & 0xFF) << 24) ^
      ((xPattern & 0xF) << 8) ^
      ((yPattern & 0xF) << 12) ^
      ((zPattern & 0xF) << 20) ^
      ((x & 0x3) << 26) ^
      ((y & 0x3) << 28)
    );
  }

  /** Add a composed outfit frame to the atlas, with masking */
  addComposedOutfit(
    baseIdentifier: number, // Unique composed frame key
    outfit: Outfit,
    item: any,
    frame: number,
    xPattern: number,
    yPattern: number,
    zPattern: number,
    x: number,
    y: number
  ): void {
    if (this.has(baseIdentifier)) return;
    const cell = this.reserveCell(baseIdentifier);

    // Compose and draw to scratch canvas, then draw into atlas
    const imgData = this.composeOutfitImageData(outfit, item, frame, xPattern, yPattern, zPattern, x, y);
    const cellSize = 32 + 2;
    const col = cell % this.size;
    const row = Math.floor(cell / this.size);
    const dx = col * cellSize + 1, dy = row * cellSize + 1;

    this.atlasCtx.putImageData(imgData, dx, dy);
    this.atlasSource.update();

    // Create texture
    const frameRect = new Rectangle(dx, dy, 32, 32);
    const tex = new Texture({ source: this.atlasSource, frame: frameRect, orig: frameRect });
    tex.updateUvs();
    this.textures[cell] = tex;
  }

  /** Compose a new ImageData for an outfit frame */
  composeOutfitImageData(
    outfit: Outfit,
    item: any,
    frame: number,
    xPattern: number,
    yPattern: number,
    zPattern: number,
    x: number,
    y: number
  ): ImageData {
    // 1. Get base and mask sprite IDs
    const baseId = item.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
    const maskId = item.getSpriteId(frame, xPattern, yPattern, zPattern, 1, x, y);

    // 2. Decode base into new ImageData (copy, don't overwrite scratch)
    const baseData = new ImageData(new Uint8ClampedArray(this.decodeSprite(baseId).data), 32, 32);

    if (maskId !== 0) {
      const maskData = this.decodeSprite(maskId);
      this.applyOutfitMask(baseData, maskData, outfit);
    }
    return baseData;
  }

  /** Colorize outfit ImageData with mask and palette */
  applyOutfitMask(baseData: ImageData, maskData: ImageData, outfit: Outfit): void {
    // Map mask colors to outfit palette
    const HEAD = outfit.getColor(outfit.details.head);
    const BODY = outfit.getColor(outfit.details.body);
    const LEGS = outfit.getColor(outfit.details.legs);
    const FEET = outfit.getColor(outfit.details.feet);

    const mask = new Uint32Array(maskData.data.buffer);
    const base = baseData.data;

    for (let i = 0; i < mask.length; i++) {
      const offset = 4 * i;
      switch (mask[i]) {
        case 0xFF00FFFF: // Head
          base[offset + 0] = (base[offset + 0] * ((HEAD >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((HEAD >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((HEAD >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFF0000FF: // Body
          base[offset + 0] = (base[offset + 0] * ((BODY >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((BODY >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((BODY >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFF00FF00: // Legs
          base[offset + 0] = (base[offset + 0] * ((LEGS >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((LEGS >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((LEGS >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFFFF0000: // Feet
          base[offset + 0] = (base[offset + 0] * ((FEET >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((FEET >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((FEET >> 16) & 0xFF)) / 0xFF;
          break;
      }
    }
  }

  
}

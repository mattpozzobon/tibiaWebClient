import Outfit from "../game/outfit";
import Position from "../game/position";
import PacketReader from "../network/packetreader";
import Canvas from "./canvas";
import * as PIXI from "pixi.js";

export default class SpriteBuffer {
  size: number;
  private __spriteBufferIndex: number = 0;
  private __spriteBufferArray: (PIXI.Texture | null)[];
  private __spriteBufferLookup: Record<number, number> = {};
  private static __globalSpriteAddressPointers: Record<number, number> = {};
  private static __globalPacket: PacketReader | null = null;

  __spriteBufferCanvas: Canvas;
  private compositionCanvas: Canvas;
  public static __version: number | null = null;
  nEvictions: number = 0;
  static SIGNATURES: Record<string, number> = {
    "57BBD603": 1098
  };

  constructor(size: number) {
    this.size = size;
    this.__spriteBufferArray = new Array(size * size).fill(null);
    this.__spriteBufferCanvas = new Canvas(null, 32 * size, 32 * size);
    this.compositionCanvas = new Canvas(null, 32, 32);
  }

  getSpritePosition(id: number): Position | null {
    if (!this.has(id)) return null;
    return this.__getPosition(this.__spriteBufferLookup[id]);
  }

  clear(): void {
    this.__spriteBufferIndex = 0;
    this.__spriteBufferArray.fill(null);
    this.__spriteBufferLookup = {};
    this.__spriteBufferCanvas.clear();
  }

  has(id: number): boolean {
    return this.__spriteBufferLookup.hasOwnProperty(id);
  }

  reserve(id: number): Position {
    this.__evict(this.__spriteBufferIndex);
    this.__spriteBufferArray[this.__spriteBufferIndex] = null;
    this.__spriteBufferLookup[id] = this.__spriteBufferIndex;
    let position = this.__getPosition(this.__spriteBufferIndex);
    this.__spriteBufferIndex = (this.__spriteBufferIndex + 1) % this.__spriteBufferArray.length;
    return position;
  }

  /** 🔹 Get a PIXI.Texture, fetching if necessary */
  get(id: number): PIXI.Texture | null {
    if (id === 0) return null;
    if (!this.has(id))
      return this.__add(id);
    return this.__get(id);
  }

  static load(name: string, data: ArrayBuffer | ProgressEvent<FileReader>): void {
    try {
      if (data instanceof ArrayBuffer) {
        SpriteBuffer.__loadGlobal(name, data);
      } else {
        const result = (data.target as FileReader).result;
        if (result instanceof ArrayBuffer) {
          SpriteBuffer.__loadGlobal(name, result);
        } else {
          throw new Error("Failed to load sprite: result is not an ArrayBuffer.");
        }
        window.gameClient.database.storeGameFile(name, result);
      }
    } catch (exception) {
      window.gameClient.interface.modalManager.open("floater-connecting", {
        message: exception instanceof Error ? exception.message : String(exception)
      });
    }
  }

  private static __loadGlobal(name: string, buffer: ArrayBuffer): void {
    this.__globalPacket = new PacketReader(buffer);

    const signature = this.__globalPacket.readUInt32().toString(16).toUpperCase();
    if (!SpriteBuffer.SIGNATURES.hasOwnProperty(signature)) {
      throw new Error("Unknown Tibia.spr file supplied.");
    }

    this.__version = SpriteBuffer.SIGNATURES[signature];
    const spriteCount = this.__globalPacket.readUInt32();

    let storedCount = 0;
    for (let i = 1; i <= spriteCount; i++) {
      const address = this.__globalPacket.readUInt32();
      if (address !== 0) {
        this.__globalSpriteAddressPointers[i] = address;
        storedCount++;
      }
    }

    console.log(`✅ Stored ${storedCount} global sprite addresses.`);
    window.gameClient.interface.loadAssetCallback("sprite", name);
  }

  private __add(id: number): PIXI.Texture {
    const position = this.reserve(id);
    const imageData = this.__getImageData(id);

    // Convert ImageData to canvas, then to PIXI.Texture
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);

    const texture = PIXI.Texture.from(canvas);
    this.__spriteBufferArray[this.__spriteBufferLookup[id]] = texture;
    return texture;
  }

  private __get(id: number): PIXI.Texture {
    const index = this.__spriteBufferLookup[id];
    return this.__spriteBufferArray[index]!;
  }

  private __evict(index: number): void {
    if (this.__spriteBufferArray[index] === null) return;
    this.nEvictions++;
    // Destroy the PIXI.Texture to free GPU memory
    this.__spriteBufferArray[index]?.destroy(true);
    // Find and remove the sprite ID that maps to this index
    const spriteId = Number(Object.keys(this.__spriteBufferLookup).find(key => this.__spriteBufferLookup[Number(key)] === index));
    delete this.__spriteBufferLookup[spriteId];
    this.__spriteBufferArray[index] = null;
  }

  private __getPosition(index: number): Position {
    const x = index % this.size;
    const y = Math.floor(index / this.size);
    return new Position(x, y, 0);
  }

  private __getImageData(id: number): ImageData {
    const address = SpriteBuffer.__globalSpriteAddressPointers[id];
    return this.__loadSingleSprite(address);
  }

  private __loadSingleSprite(address: number): ImageData {
    if (!SpriteBuffer.__globalPacket) {
      throw new Error("❌ Global sprite data has not been loaded yet!");
    }

    const spriteLength = SpriteBuffer.__globalPacket.buffer[address + 3] + (SpriteBuffer.__globalPacket.buffer[address + 4] << 8);
    const spritePacket = SpriteBuffer.__globalPacket.slice(address, address + 5 + spriteLength);

    const alpha = spritePacket.readRGB();
    spritePacket.skip(2);

    const buffer = new Uint32Array(32 * 32);
    let index = 0;

    while (spritePacket.readable()) {
      const transparentPixels = spritePacket.readUInt16();
      const coloredPixels = spritePacket.readUInt16();

      index += transparentPixels;

      for (let i = index; i < index + coloredPixels; i++) {
        const r = spritePacket.readUInt8();
        const g = spritePacket.readUInt8();
        const b = spritePacket.readUInt8();
        const a = spritePacket.readUInt8();
        buffer[i] = (a << 24) | (b << 16) | (g << 8) | r;
      }
      index += coloredPixels;
    }

    return new ImageData(new Uint8ClampedArray(buffer.buffer), 32, 32);
  }

  addComposedOutfit(baseIdentifier: number, outfit: Outfit, item: any, frame: number, xPattern: number, zPattern: number, x: number, y: number): void {
    if (this.has(baseIdentifier)) {
      return;
    }
    const position = this.reserve(baseIdentifier);
    this.addComposedOutfitLayer(position, outfit, item, frame, xPattern, 0, zPattern, x, y);
  }

  addComposedOutfitLayer(
    position: Position,
    outfit: Outfit,
    item: any,
    frame: number,
    xPattern: number,
    yPattern: number,
    zPattern: number,
    x: number,
    y: number
  ): void {
    const groundSprite = item.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
    const maskSprite = item.getSpriteId(frame, xPattern, yPattern, zPattern, 1, x, y);
    this.addComposed(position, outfit, groundSprite, maskSprite);
  }

  addComposed(position: Position, outfit: Outfit, base: number, mask: number): void {
    if (base === 0) {
      return;
    }

    const baseData = this.__getImageData(base);

    if (mask !== 0) {
      this.__compose(outfit, baseData, this.__getImageData(mask));
    }

    this.compositionCanvas.context.putImageData(baseData, 0, 0);
    this.__spriteBufferCanvas.context.drawImage(this.compositionCanvas.canvas, 32 * position.x, 32 * position.y);
  }

  private __compose(outfit: Outfit, baseData: ImageData, maskData: ImageData): void {
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
          base[offset] = (base[offset] * ((HEAD >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((HEAD >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((HEAD >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFF0000FF: // Body
          base[offset] = (base[offset] * ((BODY >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((BODY >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((BODY >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFF00FF00: // Legs
          base[offset] = (base[offset] * ((LEGS >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((LEGS >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((LEGS >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFFFF0000: // Feet
          base[offset] = (base[offset] * ((FEET >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((FEET >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((FEET >> 16) & 0xFF)) / 0xFF;
          break;
      }
    }
  }
}

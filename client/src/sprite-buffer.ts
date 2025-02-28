import Canvas from "./canvas";
import Outfit from "./outfit";
import PacketReader from "./packetreader";
import Position from "./position";
import Sprite from "./sprite";

export default class SpriteBuffer {
  size: number;
  private __spriteBufferIndex: number = 0;
  private __spriteBufferArray: (number | null)[];
  private __spriteBufferLookup: Record<number, number> = {};
  private static __globalSpriteAddressPointers: Record<number, number> = {};
  private static __globalPacket: PacketReader | null = null;

  __spriteBufferCanvas: Canvas;
  private compositionCanvas: Canvas;
  public static __version: number | null = null;
  nEvictions: number = 0;
  static SIGNATURES: Record<string, number> = {
    "41B9EA86": 740,
    "439852BE": 760,
    "57BBD603": 1098
  };

  constructor(size: number) {
    this.size = size;
    this.__spriteBufferArray = new Array(size * size).fill(null);
    this.__spriteBufferCanvas = new Canvas(null, 32 * size, 32 * size);
    this.compositionCanvas = new Canvas(null, 32, 32);
  }

  /** 🔹 Get position of a sprite in the current buffer */
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
    this.__spriteBufferArray[this.__spriteBufferIndex] = id;
    this.__spriteBufferLookup[id] = this.__spriteBufferIndex;
    let position = this.__getPosition(this.__spriteBufferIndex);
    this.__spriteBufferIndex = (this.__spriteBufferIndex + 1) % this.__spriteBufferArray.length;
    return position;
  }

  /** 🔹 Get a sprite, fetching if necessary */
  get(id: number): Sprite | null {
    if (id === 0) return null;

    if (!this.has(id)) {
        if (!SpriteBuffer.__globalSpriteAddressPointers[id]) {
            console.error(`Sprite address for ID ${id} does not exist in global storage.`);
        }
        return this.__add(id);
    }
    return this.__get(id);
  }

  /** 🔹 Global Sprite Loader */
  static load(name: string, data: ArrayBuffer | ProgressEvent<FileReader>): void {
    try {
        if (data instanceof ArrayBuffer) {
            // Directly use ArrayBuffer from IndexedDB
            SpriteBuffer.__loadGlobal(name, data);
        } else {
            const result = (data.target as FileReader).result;
            if (result instanceof ArrayBuffer) {
                SpriteBuffer.__loadGlobal(name, result);
            } else {
                throw new Error("Failed to load sprite: result is not an ArrayBuffer.");
            }
            window.gameClient.database.storeFile(name, result);
        }
    } catch (exception) {
        window.gameClient.interface.modalManager.open("floater-connecting", exception);
    }
  }

  /** 🔹 Load sprites into global storage */
  private static __loadGlobal(name: string, buffer: ArrayBuffer): void {
    let start = performance.now();
    
    // Ensure globalPacket is initialized
    this.__globalPacket = new PacketReader(buffer);

    let signature = this.__globalPacket.readUInt32().toString(16).toUpperCase();
    if (!SpriteBuffer.SIGNATURES.hasOwnProperty(signature)) {
        throw new Error("Unknown Tibia.spr file supplied.");
    }

    this.__version = SpriteBuffer.SIGNATURES[signature];
    let spriteCount = this.__version > 760 ? this.__globalPacket.readUInt32() : this.__globalPacket.readUInt16();

    let storedCount = 0;
    for (let i = 1; i <= spriteCount; i++) {
        let address = this.__globalPacket.readUInt32();

        if (address !== 0) {
            this.__globalSpriteAddressPointers[i] = address;
            storedCount++;
        }
    }

    console.log(`✅ Stored ${storedCount} global sprite addresses.`);
    window.gameClient.interface.loadAssetCallback("sprite", name);
  } 

  /** 🔹 Add sprite to the local buffer */
  private __add(id: number): Sprite {
    let position = this.reserve(id);
    let imageData = this.__getImageData(id);
    this.__spriteBufferCanvas.context.putImageData(imageData, 32 * position.x, 32 * position.y);
    return new Sprite(this.__spriteBufferCanvas.canvas, position, 32);
  }

  private __get(id: number): Sprite {
    let index = this.__spriteBufferLookup[id];
    let position = this.__getPosition(index);
    return new Sprite(this.__spriteBufferCanvas.canvas, position, 32);
  }

  private __evict(index: number): void {
    if (this.__spriteBufferArray[index] === null) return;
    this.nEvictions++;
    delete this.__spriteBufferLookup[this.__spriteBufferArray[index]!];
  }

  private __getPosition(index: number): Position {
    let x = index % this.size;
    let y = Math.floor(index / this.size);
    return new Position(x, y, 0);
  }

  /** 🔹 Load image data from global storage */
  private __getImageData(id: number): ImageData {
    const address = SpriteBuffer.__globalSpriteAddressPointers[id];
    if (address === undefined) {
      throw new Error(`Sprite address for id ${id} not found.`);
    }
    return this.__loadSingleSprite(address);
  }

  private __loadSingleSprite(address: number): ImageData {
    if (!SpriteBuffer.__globalPacket) {
        throw new Error("❌ Global sprite data has not been loaded yet!");
    }

    let spriteLength = SpriteBuffer.__globalPacket.buffer[address + 3] + (SpriteBuffer.__globalPacket.buffer[address + 4] << 8);
    let spritePacket = SpriteBuffer.__globalPacket.slice(address, address + 5 + spriteLength);

    let alpha = spritePacket.readRGB();
    spritePacket.skip(2);

    let buffer = new Uint32Array(32 * 32);
    let index = 0;

    while (spritePacket.readable()) {
        let transparentPixels = spritePacket.readUInt16();
        let coloredPixels = spritePacket.readUInt16();

        index += transparentPixels;

        for (let i = index; i < index + coloredPixels; i++) {
            let r = spritePacket.readUInt8();
            let g = spritePacket.readUInt8();
            let b = spritePacket.readUInt8();
            let a = spritePacket.readUInt8();
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

    let position = this.reserve(baseIdentifier);
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
    let groundSprite = item.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
    let maskSprite = item.getSpriteId(frame, xPattern, yPattern, zPattern, 1, x, y);
    this.addComposed(position, outfit, groundSprite, maskSprite);
  }
  
  addComposed(position: Position, outfit: Outfit, base: number, mask: number): void {
    if (base === 0) {
      return;
    }
  
    let baseData = this.__getImageData(base);
    
    if (mask !== 0) {
      this.__compose(outfit, baseData, this.__getImageData(mask));
    }
  
    this.compositionCanvas.context.putImageData(baseData, 0, 0);
    this.__spriteBufferCanvas.context.drawImage(this.compositionCanvas.canvas, 32 * position.x, 32 * position.y);
  }
  
  private __compose(outfit: Outfit, baseData: ImageData, maskData: ImageData): void {
    let HEAD = outfit.getColor(outfit.details.head);
    let BODY = outfit.getColor(outfit.details.body);
    let LEGS = outfit.getColor(outfit.details.legs);
    let FEET = outfit.getColor(outfit.details.feet);
  
    let mask = new Uint32Array(maskData.data.buffer);
    let base = baseData.data;
  
    for (let i = 0; i < mask.length; i++) {
      let offset = 4 * i;
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

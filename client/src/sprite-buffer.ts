import Canvas from "./canvas";
import GameClient from "./gameclient";
import Outfit from "./outfit";
import PacketReader from "./packetreader";
import Position from "./position";
import Sprite from "./sprite";

export default class SpriteBuffer {
  size: number;
  gameClient: GameClient;
  private __spriteBufferIndex: number = 0;
  private __spriteBufferArray: (number | null)[];
  private __spriteBufferLookup: Record<number, number> = {};
  __spriteBufferCanvas: Canvas;
  private compositionCanvas: Canvas;
  __version: number | null = null;
  nEvictions: number = 0;
  static SIGNATURES: Record<string, number> = {
    "41B9EA86": 740,
    "439852BE": 760,
    "57BBD603": 1098
  };
  private __spriteAddressPointers: Record<number, number> = {};
  private packet!: PacketReader;

  constructor(gameClient: GameClient, size: number) {
    this.gameClient = gameClient;
    this.size = size;
    this.__spriteBufferArray = new Array(size * size).fill(null);
    this.__spriteBufferCanvas = new Canvas(this.gameClient, null, 32 * size, 32 * size);
    this.compositionCanvas = new Canvas(this.gameClient, null, 32, 32);
  }

  getVersion(): number | null {
    return this.__version;
  }

  addComposedOutfitLayer(position: Position, outfit: Outfit, item: any, frame: number, xPattern: number, yPattern: number, zPattern: number, x: number, y: number): void {
    let groundSprite = item.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
    let maskSprite = item.getSpriteId(frame, xPattern, yPattern, zPattern, 1, x, y);
    this.addComposed(position, outfit, groundSprite, maskSprite);
  }

  getSpritePosition(id: number): Position | null {
    if (!this.has(id)) {
      return null;
    }
    return this.__getPosition(this.__spriteBufferLookup[id]);
  }

  addComposedOutfit(baseIdentifier: number, outfit: Outfit, item: any, frame: number, xPattern: number, zPattern: number, x: number, y: number): void {
    let position = this.reserve(baseIdentifier);
    this.addComposedOutfitLayer(position, outfit, item, frame, xPattern, 0, zPattern, x, y);
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

  get(id: number): Sprite | null {
    if (id === 0) {
      return null;
    }
    if (!this.has(id)) {
      return this.__add(id);
    }
    return this.__get(id);
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

  load(name: string, event: ProgressEvent<FileReader>): void {
    const fileReader = event.target as FileReader | null;
    if (!fileReader || !fileReader.result) {
      this.gameClient.interface.modalManager.open("floater-connecting", "Failed to load file.");
      return;
    }
  
    try {
      this.__load(name, fileReader.result as ArrayBuffer);
      this.gameClient.database.storeFile(name, fileReader.result as ArrayBuffer);
    } catch (exception) {
      this.gameClient.interface.modalManager.open("floater-connecting", String(exception));
    }
  }

  __load(name: string, buffer: ArrayBuffer): void {
    let start = performance.now();
    this.packet = new PacketReader(this.gameClient, buffer);

    let signature = this.packet.readUInt32().toString(16).toUpperCase();
    if (!SpriteBuffer.SIGNATURES.hasOwnProperty(signature)) {
      throw new Error("Unknown Tibia.spr file supplied.");
    }
    this.__version = SpriteBuffer.SIGNATURES[signature];

    let spriteCount = this.__version > 760 ? this.packet.readUInt32() : this.packet.readUInt16();
    for (let i = 1; i < spriteCount; i++) {
      let address = this.packet.readUInt32();
      if (address !== 0) {
        this.__spriteAddressPointers[i] = address;
      }
    }

    console.log(`Completed loading ${spriteCount} sprites in ${Math.round(performance.now() - start)} milliseconds.`);
    this.gameClient.interface.loadAssetCallback("sprite", name);
  }

  private __add(id: number): Sprite {
    let position = this.reserve(id);
    let imageData = this.__getImageData(id);
    this.__spriteBufferCanvas.context.putImageData(imageData, 32 * position.x, 32 * position.y);
    return new Sprite(this.__spriteBufferCanvas.canvas, position, 32);
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
        case 0xFF00FFFF:
          base[offset] = (base[offset] * ((HEAD >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((HEAD >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((HEAD >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFF0000FF:
          base[offset] = (base[offset] * ((BODY >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((BODY >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((BODY >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFF00FF00:
          base[offset] = (base[offset] * ((LEGS >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((LEGS >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((LEGS >> 16) & 0xFF)) / 0xFF;
          break;
        case 0xFFFF0000:
          base[offset] = (base[offset] * ((FEET >> 0) & 0xFF)) / 0xFF;
          base[offset + 1] = (base[offset + 1] * ((FEET >> 8) & 0xFF)) / 0xFF;
          base[offset + 2] = (base[offset + 2] * ((FEET >> 16) & 0xFF)) / 0xFF;
          break;
      }
    }
  }

  private __get(id: number): Sprite {
    let index = this.__spriteBufferLookup[id];
    let position = this.__getPosition(index);
    return new Sprite(this.__spriteBufferCanvas.canvas, position, 32);
  }

  private __evict(index: number): void {
    if (this.__spriteBufferArray[index] === null) {
      return;
    }
    this.nEvictions++;
    delete this.__spriteBufferLookup[this.__spriteBufferArray[index]!];
  }

  private __getPosition(index: number): Position {
    let x = index % this.size;
    let y = Math.floor(index / this.size);
    return new Position(x, y, 0);
  }

  private __getImageData(id: number): ImageData {
    return this.__loadSingleSprite(this.__spriteAddressPointers[id]);
  }


  private __loadSingleSprite(address: number): ImageData {
    /*
     * Function __loadSingleSprite
     * Loads a single sprite from the full sprite buffer
     */
  
    // Read ahead to get the sprite length
    let spriteLength = this.packet.buffer[address + 3] + (this.packet.buffer[address + 4] << 8);
  
    // Cut off the right slice counting from the address
    let spritePacket = this.packet.slice(address, address + 5 + spriteLength);
  
    // Alpha color (transparency key, if used)
    let alpha = spritePacket.readRGB();
    
    // Skip RGB transparency color and the pre-read length
    spritePacket.skip(2);
  
    // Allocate a buffer for 32x32 image reconstruction
    let buffer = new Uint32Array(32 * 32);
    let index = 0;
  
    // Go over the sprite packet itself
    while (spritePacket.readable()) {
      // Read the number of transparent pixels and colored pixels
      let transparentPixels = spritePacket.readUInt16();
      let coloredPixels = spritePacket.readUInt16();
  
      // Advance the index by the transparent pixels
      index += transparentPixels;
  
      // Process colored pixels
      for (let i = index; i < index + coloredPixels; i++) {
        // Read red, green, blue, and alpha bytes
        let r = spritePacket.readUInt8();
        let g = spritePacket.readUInt8();
        let b = spritePacket.readUInt8();
        let a = spritePacket.readUInt8();
  
        // Compose the pixel value (for a little-endian system, this creates [r, g, b, a])
        buffer[i] = (a << 24) | (b << 16) | (g << 8) | r;
      }
      
      // Update the index after processing the colored pixels
      index += coloredPixels;
    }
  
    return new ImageData(new Uint8ClampedArray(buffer.buffer), 32, 32);
  }
  
}

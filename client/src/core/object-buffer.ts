import { DataObject } from "../core/dataobject";
import PacketReader from "../network/packetreader";
import BitFlagGenerator, { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";


class ObjectBuffer {
  private dataObjects: Record<number, DataObject>;
  __version: number;
  private itemCount: number;
  private outfitCount: number;
  private effectCount: number;
  private distanceCount: number;
  private totalObjectCount: number;

  constructor() {
    /*
     * Class ObjectBuffer
     * Container for Tibia.dat that contains item information and pointers to sprites
     */
    
    this.dataObjects = {};
    this.__version = 0;
    this.itemCount = 0;
    this.outfitCount = 0;
    this.effectCount = 0;
    this.distanceCount = 0;
    this.totalObjectCount = 0;
  }

  static readonly SIGNATURES: Record<string, number> = {
    "41BF619C": 740,
    "439D5A33": 760,
    "42A3": 1098,
  };

  static readonly attributes: Record<string, number> = {
    ThingAttrGround: 0,
    ThingAttrGroundBorder: 1,
    ThingAttrOnBottom: 2,
    ThingAttrOnTop: 3,
    ThingAttrContainer: 4,
    ThingAttrStackable: 5,
    ThingAttrForceUse: 6,
    ThingAttrMultiUse: 7,
    ThingAttrWritable: 8,
    ThingAttrWritableOnce: 9,
    ThingAttrFluidContainer: 10,
    ThingAttrSplash: 11,
    ThingAttrNotWalkable: 12,
    ThingAttrNotMoveable: 13,
    ThingAttrBlockProjectile: 14,
    ThingAttrNotPathable: 15,
    ThingAttrPickupable: 16,
    ThingAttrHangable: 17,
    ThingAttrHookSouth: 18,
    ThingAttrHookEast: 19,
    ThingAttrRotateable: 20,
    ThingAttrLight: 21,
    ThingAttrDontHide: 22,
    ThingAttrTranslucent: 23,
    ThingAttrDisplacement: 24,
    ThingAttrElevation: 25,
    ThingAttrLyingCorpse: 26,
    ThingAttrAnimateAlways: 27,
    ThingAttrMinimapColor: 28,
    ThingAttrLensHelp: 29,
    ThingAttrFullGround: 30,
    ThingAttrLook: 31,
    ThingAttrCloth: 32,
    ThingAttrMarket: 33,
    ThingAttrUsable: 34,
    ThingAttrWrapable: 35,
    ThingAttrUnwrapable: 36,
    ThingAttrTopEffect: 37,
    ThingAttrOpacity: 100,
    ThingAttrNotPreWalkable: 101,
    ThingAttrFloorChange: 252,
    ThingAttrNoMoveAnimation: 253,
    ThingAttrChargeable: 254,
    ThingAttrLast: 255,
  };
  
  getOutfit(id: number): DataObject | null {
    if (id < 0 || id > this.outfitCount) {
      return null;
    }
    return this.get(this.__getOutfitIdentifier(id));
  }

  load(name: string, event: ProgressEvent<FileReader>): void {
    try {
      const result = (event.target as FileReader).result;
      if (result instanceof ArrayBuffer) {
        this.__load(name, result);
        window.gameClient.database.storeGameFile(name, result);
      } else {
        throw new Error("Failed to load Tibia.dat: result is not an ArrayBuffer.");
      }
    } catch (exception) {
      window.gameClient.interface.modalManager.open("floater-connecting", { message: exception instanceof Error ? exception.message : String(exception) });
    }
  }

  private __getOutfitIdentifier(id: number): number {
    return this.itemCount + id;
  }

  private __isOutfit(id: number): boolean {
    return id > this.itemCount && id <= this.itemCount + this.outfitCount;
  }

  private __hasFrameGroups(id: number): boolean {
    return this.__version !== null && this.__version >= 1050 && this.__isOutfit(id);
  }

  public __load(name: string, buffer: ArrayBuffer): void {
    const start = performance.now();
  
    // Wrap the buffer in a packet reader class.
    const packet = new PacketReader(buffer);
  
    // Read the signature from the file.
    const signature = packet.readUInt32().toString(16).toUpperCase();
  
    // Verify the 4 byte data signature.
    if (!ObjectBuffer.SIGNATURES.hasOwnProperty(signature)) {
      throw new Error("Unknown Tibia.dat file supplied.");
    }
  
    this.__version = ObjectBuffer.SIGNATURES[signature];
  
    // Number of outfits, effects, and distance effects.
    this.itemCount = packet.readUInt16();
    this.outfitCount = packet.readUInt16();
    this.effectCount = packet.readUInt16();
    this.distanceCount = packet.readUInt16();
    this.totalObjectCount = this.itemCount + this.outfitCount + this.effectCount + this.distanceCount;
  
    // Item identifiers start at 100. Do not ask me why..
    for (let id = 100; id <= this.totalObjectCount; id++) {
      const flags = this.__readFlags(packet);
      // Create a new data object.

      const dataObject = new DataObject(flags);
  
      // Update the group count if this is an outfit.
      dataObject.setGroupCount(this.__hasFrameGroups(id) ? packet.readUInt8() : 1);
  
      // For each group in the data object.
      for (let _ = 0; _ < dataObject.groupCount; _++) {
        // Create a new frame group.
        const frameGroup = new FrameGroup();
        frameGroup.type = this.__hasFrameGroups(id) ? packet.readUInt8() : 0;
  
        // Read sprite parameters: defines width and height.
        const width = packet.readUInt8();
        const height = packet.readUInt8();
  
        // Set the size.
        frameGroup.setSize(width, height);
  
        // If big then skip the following byte.
        if (width > 1 || height > 1) {
          packet.readUInt8();
        }
  
        // Some frames are blended (combination of multiple sprites).
        frameGroup.setLayers(packet.readUInt8());
  
        const x = packet.readUInt8();
        const y = packet.readUInt8();
        const z = this.__version >= 755 ? packet.readUInt8() : 1;
  
        // Next three bytes are x, y, z patterns.
        frameGroup.setPattern(x, y, z);
  
        frameGroup.setAnimationLength(packet.readUInt8());
  
        // Read frame durations if animated and version supports it.
        if (frameGroup.isAnimated() && this.__version >= 1050) {
          const animationLengths: { min: number; max: number; }[] = [];
          frameGroup.asynchronous = packet.readUInt8();
          frameGroup.nLoop = packet.readUInt32();
          frameGroup.start = packet.readInt8();
  
          // Read the animation lengths.
          for (let i = 0; i < frameGroup.animationLength; i++) {
            animationLengths.push(packet.readAnimationLength());
          }
  
          frameGroup.setAnimation(animationLengths);
        }
  
        // Read all the sprite identifiers.
        for (let i = 0; i < frameGroup.getNumberSprites(); i++) {
          frameGroup.sprites.push(this.__version >= 960 ? packet.readUInt32() : packet.readUInt16());
        }
  
        dataObject.frameGroups.push(frameGroup);
      }
  
      // Reference in a hashmap by identifier.
      this.dataObjects[id] = dataObject;
    }
  
    //LoopedAnimation.initialize(window.gameClient);
  
    console.log(`Completed loading ${this.totalObjectCount} data objects in ${Math.round(performance.now() - start)} milliseconds.`);
  
    window.gameClient.interface.loadAssetCallback("data", name);
  }


  getAnimation(id: number): DataObject | null {
    /*
     * Function ObjectBuffer.getAnimation
     * Returns the internal outfit identifier of an external outfit identifier
     */
    if (id < 0 || id > this.effectCount) {
      return null;
    }
    return this.get(this.getAnimationId(id));
  }

  getDistanceAnimation(id: number): DataObject | null {
    /*
     * Function ObjectBuffer.getDistanceAnimation
     * Returns the internal animation identifier of an external animation identifier
     */
    return this.get(this.getDistanceAnimationId(id));
  }

  getVersion(): number | null {
    return this.__version;
  }

  get(id: number): DataObject {
    return this.dataObjects[id];
  }

  // private __createLoopedAnimations(): void {
  //   LoopedAnimation.initialize();
  // }

  getAnimationId(id: number): number {
    if (id < 1 || id > this.effectCount) {
      throw new Error("Invalid animation ID");
    }
    return this.itemCount + this.outfitCount + id;
  }

  getDistanceAnimationId(id: number): number {
    if (id < 1 || id > this.distanceCount) {
      throw new Error("Invalid distance animation ID");
    }
    return this.itemCount + this.outfitCount + this.effectCount + id;
  }

  private __mapVersionFlag(flag: number): number {
    // This always means the final flag regardless of the version.
    if (flag === ObjectBuffer.attributes.ThingAttrLast) {
      return flag;
    }
  
    // Specific .dat version handling.
    if (this.__version >= 1000) {
      if (flag === 16) {
        return ObjectBuffer.attributes.ThingAttrNoMoveAnimation;
      } else if (flag > 16) {
        return flag - 1;
      }
    } else if (this.__version >= 755) {
      if (flag === 23) {
        return ObjectBuffer.attributes.ThingAttrFloorChange;
      }
    } else if (this.__version >= 740) {
      // Increment flags 1 to 15.
      if (flag > 0 && flag <= 15) {
        if (flag === 5) return ObjectBuffer.attributes.ThingAttrMultiUse;
        if (flag === 6) return ObjectBuffer.attributes.ThingAttrForceUse;
        return flag + 1;
      } else {
        // Switch around some flags.
        switch (flag) {
          case 16:
            return ObjectBuffer.attributes.ThingAttrLight;
          case 17:
            return ObjectBuffer.attributes.ThingAttrFloorChange;
          case 18:
            return ObjectBuffer.attributes.ThingAttrFullGround;
          case 19:
            return ObjectBuffer.attributes.ThingAttrElevation;
          case 20:
            return ObjectBuffer.attributes.ThingAttrDisplacement;
          case 22:
            return ObjectBuffer.attributes.ThingAttrMinimapColor;
          case 23:
            return ObjectBuffer.attributes.ThingAttrRotateable;
          case 24:
            return ObjectBuffer.attributes.ThingAttrLyingCorpse;
          case 25:
            return ObjectBuffer.attributes.ThingAttrHangable;
          case 26:
            return ObjectBuffer.attributes.ThingAttrHookSouth;
          case 27:
            return ObjectBuffer.attributes.ThingAttrHookEast;
          case 28:
            return ObjectBuffer.attributes.ThingAttrAnimateAlways;
        }
      }
    }
  
    return flag;
  }  

  public __readFlags(packet: PacketReader): { flags: BitFlagGenerator; properties: any } {
    const flags = PropBitFlag.clone(); 
    const properties: any = {};
  
    while (true) {
      const flag = this.__mapVersionFlag(packet.readUInt8());
      switch (flag) {
        // End byte: we are finished reading the data flags.
        case ObjectBuffer.attributes.ThingAttrLast: {
          return { flags, properties };
        }
        case ObjectBuffer.attributes.ThingAttrGround: {
          flags.set(PropBitFlag.DatFlagGround);
          properties.speed = packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrGroundBorder: {
          flags.set(PropBitFlag.DatFlagGroundBorder);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrOnBottom: {
          flags.set(PropBitFlag.DatFlagOnBottom);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrOnTop: {
          flags.set(PropBitFlag.DatFlagOnTop);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrContainer: {
          flags.set(PropBitFlag.DatFlagContainer);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrStackable: {
          flags.set(PropBitFlag.DatFlagStackable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrForceUse: {
          flags.set(PropBitFlag.DatFlagForceUse);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrMultiUse: {
          flags.set(PropBitFlag.DatFlagMultiUse);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrWritable: {
          flags.set(PropBitFlag.DatFlagWritable);
          // Length read is ignored here.
          const length = packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrWritableOnce: {
          flags.set(PropBitFlag.DatFlagWritableOnce);
          const length = packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrFluidContainer: {
          flags.set(PropBitFlag.DatFlagFluidContainer);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrSplash: {
          flags.set(PropBitFlag.DatFlagSplash);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrNotWalkable: {
          flags.set(PropBitFlag.DatFlagNotWalkable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrNotMoveable: {
          flags.set(PropBitFlag.DatFlagNotMoveable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrBlockProjectile: {
          flags.set(PropBitFlag.DatFlagBlockProjectile);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrNotPathable: {
          flags.set(PropBitFlag.DatFlagNotPathable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrPickupable: {
          flags.set(PropBitFlag.DatFlagPickupable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrHangable: {
          flags.set(PropBitFlag.DatFlagHangable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrHookSouth: {
          flags.set(PropBitFlag.DatFlagHookSouth);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrHookEast: {
          flags.set(PropBitFlag.DatFlagHookEast);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrRotateable: {
          flags.set(PropBitFlag.DatFlagRotateable);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrLight: {
          flags.set(PropBitFlag.DatFlagLight);
          properties.light = packet.readLight();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrDontHide: {
          flags.set(PropBitFlag.DatFlagDontHide);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrTranslucent: {
          flags.set(PropBitFlag.DatFlagTranslucent);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrDisplacement: {
          flags.set(PropBitFlag.DatFlagDisplacement);
          if (this.__version >= 755) {
            packet.readLight();
          }
          break;
        }
        case ObjectBuffer.attributes.ThingAttrElevation: {
          flags.set(PropBitFlag.DatFlagElevation);
          properties.elevation = packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrLyingCorpse: {
          flags.set(PropBitFlag.DatFlagLyingCorpse);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrAnimateAlways: {
          flags.set(PropBitFlag.DatFlagAnimateAlways);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrMinimapColor: {
          flags.set(PropBitFlag.DatFlagMinimapColor);
          properties.minimapColor = packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrLensHelp: {
          //TODO: 
          //flags.set(PropBitFlag.DatFlagLensHelp);
          packet.readUInt16();
          break;
        }
        // Not implemented cases
        case ObjectBuffer.attributes.ThingAttrFullGround: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrLook: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrCloth: {
          packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrMarket: {
          packet.skip(6);
          packet.readString();
          packet.skip(4);
          break;
        }
        case ObjectBuffer.attributes.ThingAttrUsable: {
          packet.readUInt16();
          break;
        }
        case ObjectBuffer.attributes.ThingAttrWrapable: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrUnwrapable: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrTopEffect: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrOpacity: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrNotPreWalkable: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrFloorChange: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrNoMoveAnimation: {
          break;
        }
        case ObjectBuffer.attributes.ThingAttrChargeable: {
          break;
        }
        default: {
          throw new Error("Could not parse flag " + flag.toString(16) + " of Tibia.dat");
        }
      }
    }
  }
  

}

export default ObjectBuffer;

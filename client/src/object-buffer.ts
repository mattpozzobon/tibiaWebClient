import LoopedAnimation from "./animationLooped";
import { DataObject } from "./dataobject";
import GameClient from "./gameclient";
import PacketReader from "./packetreader";

class ObjectBuffer {
  gameClient: GameClient;
  private dataObjects: Record<number, DataObject>;
  __version: number;
  private itemCount: number;
  private outfitCount: number;
  private effectCount: number;
  private distanceCount: number;
  private totalObjectCount: number;

  constructor(gameClient: GameClient) {
    /*
     * Class ObjectBuffer
     * Container for Tibia.dat that contains item information and pointers to sprites
     */
    this.gameClient = gameClient;
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

  load(name: string, event: any): void {
    try {
      this.__load(name, event.target.result);
      this.gameClient.database.storeFile(name, event.target.result);
    } catch (exception) {
      this.gameClient.interface.modalManager.open("floater-connecting", exception);
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

  __load(name: string, buffer: ArrayBuffer): void {
    let start = performance.now();
    let packet = new PacketReader(this.gameClient, buffer);
    let signature = packet.readUInt32().toString(16).toUpperCase();
    if (!ObjectBuffer.SIGNATURES.hasOwnProperty(signature)) {
      throw new Error("Unknown Tibia.dat file supplied.");
    }
    this.__version = ObjectBuffer.SIGNATURES[signature];
    this.itemCount = packet.readUInt16();
    this.outfitCount = packet.readUInt16();
    this.effectCount = packet.readUInt16();
    this.distanceCount = packet.readUInt16();
    this.totalObjectCount = this.itemCount + this.outfitCount + this.effectCount + this.distanceCount;
    for (let id = 100; id <= this.totalObjectCount; id++) {
      const flags = this.__readFlags(packet);
      let dataObject = new DataObject(flags);
      dataObject.setGroupCount(this.__hasFrameGroups(id) ? packet.readUInt8() : 1);
      this.dataObjects[id] = dataObject;
    }

    LoopedAnimation.initialize(this.gameClient);

    console.log(
      `Completed loading ${this.totalObjectCount} data objects in ${Math.round(
        performance.now() - start
      )} milliseconds.`
    );
    this.gameClient.interface.loadAssetCallback("data", name);
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
    return flag;
  }

  private __readFlags(packet: PacketReader): any {
    return {};
  }

}

export default ObjectBuffer;

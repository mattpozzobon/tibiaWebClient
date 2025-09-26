import Chunk from "../core/chunk";
import FluidThing from "../game/fluid-container";
import Item from "../game/item";
import Outfit, { OutfitEquipment } from "../game/outfit";
import { VitalsData } from "../game/player/vitals/vitals";
import Position from "../game/position";
import Thing from "../game/thing";
import RGBA from "../utils/rgba";
import Packet from "./packet";


interface OutfitIdName {
  id: number;
  name: string;
}

export default class PacketReader extends Packet {
  buffer: Uint8Array;
  index: number = 0;

  constructor(buffer: ArrayBuffer) {
    super();
    
    this.buffer = new Uint8Array(buffer);
  }

  public slice(start: number, end: number): PacketReader {
    /*
     * Function PacketReader.slice
     * Returns the slice of a packetreader class as a new packetreader class
     */
    return new PacketReader(this.buffer.slice(start, end));
  }
  
  public readCharacterStatistics(): { capacity: number; attack: number; armor: number; speed: number } {
    return {
      capacity: this.readUInt32(),
      attack: this.readUInt8(),
      armor: this.readUInt8(),
      speed: this.readUInt16(),
    };
  }

  readChangeOutfit(): { id: number; outfit: any } {
    return {
      id: this.readUInt32(),
      outfit: this.readOutfit(),
    };
  }

  private __readChunkTiles(): { id: number; flags: number; items: any[] }[] {
    /*
     * Function PacketReader.__readChunkTiles
     * Reads all tile identifiers from the passed chunk
     */

    let tiles: { id: number; flags: number; items: any[] }[] = [];

    for (let i = 0; i < 8; i++) {
      let ntiles = this.readUInt8();

      // Read the number of tiles in a chunk
      for (let j = 0; j < Chunk.getNumberTilesLayer(); j++) {
        if (ntiles === 0) {
          tiles.push({ id: 0, flags: 0, items: [] });
        } else {
          tiles.push({
            id: this.readUInt16(),
            flags: this.readUInt8(),
            items: this.readItems(),
          });
        }
      }
    }

    return tiles;
  }

  readContainerItemAdd(): { containerId: number; slot: number; itemId: number; count: number } {
    return {
      containerId: this.readUInt32(),
      slot: this.readUInt8(),
      itemId: this.readUInt16(),
      count: this.readUInt8(),
    };
  }

  readTileItemAdd(): { id: number; count: number; position: Position; slot: number } {
    return {
      id: this.readUInt16(),
      count: this.readUInt8(),
      position: this.readPosition(),
      slot: this.readUInt8(),
    };
  }

  readCreatureTurn(): { id: number; direction: number } {
    return {
      id: this.readUInt32(),
      direction: this.readUInt8(),
    };
  }

  readDistanceEffect(): { from: Position; to: Position; type: number } {
    return {
      from: this.readPosition(),
      to: this.readPosition(),
      type: this.readUInt8(),
    };
  }

  public readTransformTile(): { position: any; id: number } {
    return {
      position: this.readPosition(),
      id: this.readUInt16(),
    };
  }
  
  public readProperty(): { guid: number; property: number; value: number } {
    return {
      guid: this.readUInt32(),
      property: this.readUInt8(),
      value: this.readUInt32(),
    };
  }

  public readCharacterInformation(): { name: string; level: number; gender: number } {
    return {
      name: this.readString(),
      level: this.readUInt16(),
      gender: this.readUInt8(),
    };
  }
  
  public readToggleCondition(): { guid: number; toggle: boolean; cid: number } {
    return {
      guid: this.readUInt32(),
      toggle: this.readBoolean(),
      cid: this.readUInt16(),
    };
  }
  
  public readCastSpell(): { id: number; cooldown: number } {
    return {
      id: this.readUInt16(),
      cooldown: this.readUInt32(),
    };
  }
  
  public readSingleTradeOffer(): { id: number; name: string; price: number; type: "sell" | "buy" } {
    return {
      id: this.readUInt16(),
      name: this.readString(),
      price: this.readUInt32(),
      type: this.readBoolean() ? "sell" : "buy",
    };
  }
  
  public readTradeOffer(): { id: number; offers: { id: number; name: string; price: number; type: "sell" | "buy" }[] } {
    let id = this.readUInt32();
    let offers: { id: number; name: string; price: number; type: "sell" | "buy" }[] = [];
    let length = this.readUInt8();
  
    for (let i = 0; i < length; i++) {
      offers.push(this.readSingleTradeOffer());
    }
  
    return { id, offers };
  }

  public readReadable(): { writeable: boolean; content: string; name: string } {
    return {
      writeable: this.readBoolean(),
      content: this.readString(),
      name: this.readString(),
    };
  }
  
  public readAddAchievement(): { title: string; description: string } {
    return {
      title: this.readString(),
      description: this.readString(),
    };
  }
  
  public readZoneInformation(): {
    name: string;
    title: string;
    music: string;
    weather: number;
    ambient: RGBA;
    rain: boolean;
  } {
    return {
      name: this.readString(),
      title: this.readString(),
      music: this.readString(),
      weather: this.readUInt8() / 255,
      ambient: new RGBA(this.readUInt8(), this.readUInt8(), this.readUInt8(), this.readUInt8()),
      rain: this.readBoolean(),
    };
  }

  public readDefaultMessage(): { id: number; type: number; message: string; color: number } {
    return {
      id: this.readUInt32(),
      type: this.readUInt8(),
      message: this.readString(),
      color: this.readUInt8(),
    };
  }
  
  public readAnimationLength(): { min: number; max: number } {
    return {
      min: this.readUInt32(),
      max: this.readUInt32(),
    };
  }

  public readLight(): { level: number; color: number } {
    return {
      level: this.readUInt16(),
      color: this.readUInt16(),
    };
  }

  public readRemoveItem(): { position: Position; index: number; count: number } {
    return {
      position: this.readPosition(),
      index: this.readUInt8(),
      count: this.readUInt8(),
    };
  }
  
  public readContainerItemRemove(): { containerIndex: number; slotIndex: number; count: number } {
    return {
      containerIndex: this.readUInt32(),
      slotIndex: this.readUInt8(),
      count: this.readUInt8(),
    };
  }

  public readRGB(): number {
    /*
     * Function PacketReader.readRGB
     * Reads the R, G, B colors and puts A to 0xFF in a single 32-bit int
     */

    return (
      this.buffer[this.index++] + 
      (this.buffer[this.index++] << 8) + 
      (this.buffer[this.index++] << 16)
    );
  }
  
  public readGainExperience(): { id: number; experience: number } {
    return {
      id: this.readUInt32(),
      experience: this.readUInt16(),
    };
  }
  
  public readDamageEvent(): { source: number; target: number; damage: number; color: number } {
    return {
      source: this.readUInt32(),
      target: this.readUInt32(),
      damage: this.readUInt16(),
      color: this.readUInt8(),
    };
  }
  
  public readIncreaseHealth(): { id: number; amount: number } {
    return {
      id: this.readUInt32(),
      amount: this.readUInt16(),
    };
  }

  public readOpenChannel(): { id: number; name: string } {
    return {
      id: this.readUInt32(),
      name: this.readString(),
    };
  }
  
  public readInt8(): number {
    /*
     * Function PacketReader.readInt8
     * Reads a signed 8-bit integer from the packet
     */
  
    let value = this.buffer[this.index++];
    return value << 24 >> 24; // Ensure correct sign extension
  }

  public readOpenContainer(): { cid: number; id: number; title: string; items: any[] } {
    return {
      cid: this.readUInt32(),
      id: this.readUInt16(),
      title: this.readString(),
      items: this.readItems(),
    };
  }
  
  public readUInt8(): number {
    /*
     * Function PacketReader.readUInt8
     * Reads an unsigned 8-bit integer from the packet
     */
  
    return this.buffer[this.index++];
  }
  
  public readPosition(): Position {
    /*
     * Function PacketReader.readPosition
     * Reads a position from the packet
     */
  
    return new Position(this.readUInt16(), this.readUInt16(), this.readUInt16());
  }
  
  public readCreatureTeleport(): { id: number; position: Position } {
    return {
      id: this.readUInt32(),
      position: this.readPosition(),
    };
  }

  public readEntityMove(): { id: number; position: Position; speed: number } {
    const entityMove = {
      id: this.readUInt32(),
      position: this.readPosition(),
      speed: this.readUInt16(),
    };
    return entityMove;
  }
  
  public readServerData(): {
    width: number;
    height: number;
    depth: number;
    chunk: { width: number; height: number; depth: number };
    tick: number;
    clock: number;
    version: string;
    clientVersion: number;
  } {
    const width = this.readUInt16();
    const height = this.readUInt16();
    const depth = this.readUInt8();
    const chunkWidth = this.readUInt8();
    const chunkHeight = this.readUInt8();
    const chunkDepth = this.readUInt8();
    const tick = this.readUInt8();
    const clock = this.readUInt16();
    const version = this.readString();
    const clientVersion = this.readUInt16();
  
    return {
      width,
      height,
      depth,
      chunk: { width: chunkWidth, height: chunkHeight, depth: chunkDepth },
      tick,
      clock,
      version,
      clientVersion,
    };
  }
  
  
  public readUInt16(): number {
    /*
     * Function PacketReader.readUInt16
     * Reads an unsigned 16-bit integer from the packet
     */
  
    return this.buffer[this.index++] + (this.buffer[this.index++] << 8);
  }
  
  public readUInt32(): number {
    /*
     * Function PacketReader.readUInt32
     * Reads an unsigned 32-bit integer from the packet
     */
  
    return this.buffer[this.index++] + (this.buffer[this.index++] << 8) + (this.buffer[this.index++] << 16) + (this.buffer[this.index++] << 24);
  }
  
  public readThing(id: number, count: number): Item {
    let thing = new Thing(id);
  
    if (thing.isFluidContainer() || thing.isSplash()) {
      return new FluidThing(id, count) as Item;
    }
  
    return new Item(id, count);
  }

  public readItem(): Item | null{
    /*
     * Function PacketReader.readItem
     * Reads a single item from the buffer
     */
  
    let item = this.readUInt16();
    let count = this.readUInt8();
  
    if (item === 0) {
      return null;
    }
  
    return this.readThing(item, count);
  }
  
  public readItems(): Item[] {
    /*
     * Function PacketReader.readItems
     * Reads a consecutive number of items
     */
  
    let size = this.readUInt8();
    let items: Item[] = [];
  
    for (let i = 0; i < size; i++) {
      let item = this.readItem();
      if (item) items.push(item);
    }
  
    return items;
  }

  public readString(): string {
    /*
     * Function PacketReader.readString
     * Reads a string from the packet
     */
  
    let length = this.readUInt16();
  
    if (length === 0) {
      return "";
    }
  
    let string = new TextDecoder("utf-8").decode(this.buffer.slice(this.index, this.index + length));
    this.index += length;
    return string;
  }
  
  public readBoolean(): boolean {
    /*
     * Function PacketReader.readBoolean
     * Reads a boolean from the packet; an uint8 either 0 or 1
     */
  
    return this.readUInt8() === 1;
  }
  
  public readOutfit(): Outfit {
    return new Outfit({
      id: this.readUInt16(),
      details: this.readOutfitDetails(),
      equipment: this.readOutfitEquipment(),
      mount: this.readUInt16(),
      mounted: this.readBoolean(),
      addonOne: this.readBoolean(),
      addonTwo: this.readBoolean(),
    });
  }

  readOutfitEquipment(): OutfitEquipment {
    return {
      hair: this.readUInt16(),
      head: this.readUInt16(),
      body: this.readUInt16(),
      legs: this.readUInt16(),
      feet: this.readUInt16(),
      lefthand: this.readUInt16(),
      righthand: this.readUInt16(),
      backpack: this.readUInt16(),
      belt: this.readUInt16(),
    };
  }
  
  public readOutfitDetails(): { head: number; body: number; legs: number; feet: number } {
    return {
      head: this.readUInt8(),
      body: this.readUInt8(),
      legs: this.readUInt8(),
      feet: this.readUInt8(),
    };
  }

  public readCreatureType(): "Player" | "Monster" | "NPC" {
    let type = this.readUInt8();
  
    switch (type) {
      case 0:
        return "Player";
      case 1:
        return "Monster";
      case 2:
        return "NPC";
      default:
        throw new Error("Unknown creature type");
    }
  }
  
  public readCreatureInfo(): {
    id: number;
    type: "Player" | "Monster" | "NPC";
    position: Position;
    direction: number;
    outfit: Outfit;
    health: number;
    maxHealth: number;
    speed: number;
    name: string;
    conditions: number[];
  } {
    return {
      id: this.readUInt32(),
      type: this.readCreatureType(),
      position: this.readPosition(),
      direction: this.readUInt8(),
      outfit: this.readOutfit(),
      health: this.readUInt32(),
      maxHealth: this.readUInt32(),
      speed: this.readUInt16(),
      name: this.readString(),           // ✅ matches correct location now
      conditions: this.readConditions(),
    };
  }
  
  public readConditions(): number[] {
    let size = this.readUInt8();
    let conditions: number[] = [];
  
    for (let i = 0; i < size; i++) {
      conditions.push(this.readUInt8());
    }
  
    return conditions;
  }
  
  public readChunkData(): Chunk {
    let id = this.readUInt32();
    let position = this.readPosition();
    let tiles = this.__readChunkTiles();
    return new Chunk(id, position, tiles);
  }
  
  public readPrivateMessage(): { name: string; message: string } {
    return {
      name: this.readString(),
      message: this.readString(),
    };
  }

  public readChannelMessage(): { id: number; name: string; message: string; color: number } {
    /*
     * Function PacketReader.readChannelMessage
     * Reads a channel message
     */
   
    return {
      id: this.readUInt32(),
      name: this.readString(),
      message: this.readString(),
      color: this.readUInt8(),
    };
    
  }
  
  public readItemInformation(): {
    sid: number;
    cid: number;
    weight: number;
    attack: number;
    armor: number;
    distanceReadable: string;
    article: string;
    name: string;
    description: string;
    count: number;
    x: number;
    y: number;
    z: number;
  } {
    /*
     * Function PacketReader.readItemInformation
     * Reads item information from a packet
     */
    const itemInfo = {
      sid: this.readUInt16(),
      cid: this.readUInt16(),
      weight: this.readUInt32(),
      attack: this.readUInt8(),
      armor: this.readUInt8(),
      distanceReadable: this.readString(),
      article: this.readString(),
      name: this.readString(),
      description: this.readString(),
      count: this.readUInt8(),
      x: this.readUInt16(),
      y: this.readUInt16(),
      z: this.readUInt16(),
    };
    console.log("Item info:", itemInfo);
    return itemInfo;
  }
  
  public readEquipment(): (Item | null)[] {
    let items: (Item | null)[] = [];
  
    for (let i = 0; i < 15; i++) {
      let item = this.readItem();
      items[i] = item;
    }
  
    return items;
  }

  public readMagicEffect(): { position: Position; type: number } {
    return {
      position: this.readPosition(),
      type: this.readUInt8()
    };
  }  
  
  public readSkills(): {
    magic: number;
    fist: number;
    club: number;
    sword: number;
    axe: number;
    distance: number;
    shielding: number;
    fishing: number;
    experience: number;
  } {
    /*
     * Function PacketReader.readSkills
     * Reads the skill points for each skill
     */
  
    return {
      magic: this.readUInt32(),
      fist: this.readUInt32(),
      club: this.readUInt32(),
      sword: this.readUInt32(),
      axe: this.readUInt32(),
      distance: this.readUInt32(),
      shielding: this.readUInt32(),
      fishing: this.readUInt32(),
      experience: this.readUInt32(),
    };
  }

  public readFriend(): { name: string; online: boolean } {
    const nameLength = this.readUInt8();
    const name = new TextDecoder("utf-8").decode(this.buffer.slice(this.index, this.index + nameLength));
    this.index += nameLength;
    const online = this.readUInt8() === 1;
    
    return {
      name: name,
      online: online
    };
  }
  
  public readFriendlist(): Array<{ name: string; online: boolean }> {
    let length = this.readUInt8();
    let friendlist: Array<{ name: string; online: boolean }> = [];
    
    for (let i = 0; i < length; i++) {
      friendlist.push(this.readFriend());
    }
    
    return friendlist;
  }

  public readFriendRequests(): string[] {
    const count = this.readUInt8();
    const requests: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const nameLength = this.readUInt8();
      const nameBytes = this.buffer.slice(this.index, this.index + nameLength);
      this.index += nameLength;
      const requesterName = new TextDecoder('utf-8').decode(nameBytes);
      requests.push(requesterName);
    }
    
    return requests;
  }

  public readFriendUpdate(): { friends: Array<{ name: string; online: boolean }>; friendRequests: string[] } {
    const friends = this.readFriendlist();
    const friendRequests = this.readFriendRequests();
    
    return { friends, friendRequests };
  }
  
  public readPlayerInfo(): {
    id: number;
    skills: any;
    attack: number;
    equipment: (Item | null)[];
    mounts: OutfitIdName[];
    outfits: OutfitIdName[];
    spellbook: number[];
    friendlist: { friends: Array<{ name: string; online: boolean }>; friendRequests: string[] };
    outfit: Outfit;
    vitals: VitalsData;
    conditions: number[];
  } {
    return {
      id: this.readUInt32(),
      skills: this.readSkills(),
      attack: this.readUInt8(),
      equipment: this.readEquipment(),
      mounts: this.readOutfits(),
      outfits: this.readOutfits(),
      spellbook: this.readArray(),
      friendlist: {
        friends: this.readFriendlist(),
        friendRequests: this.readFriendRequests()
      },
      outfit: this.readOutfit(),
      vitals: {
        name: this.readString(),
        position: this.readPosition(),
        direction: this.readUInt8(),
        health: this.readUInt16(),
        maxHealth: this.readUInt16(),
        mana: this.readUInt16(),
        maxMana: this.readUInt16(),
        energy: this.readUInt16(),
        maxEnergy: this.readUInt16(),
        capacity: this.readUInt32(),
        maxCapacity: this.readUInt32(),
        speed: this.readUInt16(),
        attackSlowness: this.readUInt8(),
      },
      conditions: this.readConditions(),
    };
  }
  
  public readArray(): number[] {
    let length = this.readUInt8();
    let array: number[] = [];
  
    for (let i = 0; i < length; i++) {
      array.push(this.readUInt16());
    }
  
    return array;
  }

  public readOutfits(): OutfitIdName[] {
    /*
     * Function PacketReader.readOutfits
     * Reads all the outfits from a packet
     */
  
    let length = this.readUInt8();
    let outfits: OutfitIdName[] = [];
  
    for (let i = 0; i < length; i++) {
      outfits.push(this.__readSingleOutfit());
    }
  
    return outfits;
  }

  public discard(): void {
    this.index = this.buffer.length;
  }
  
  public readable(): boolean {
    /*
     * Function PacketReader.readable
     * Returns false if the packet was exhausted
     */
  
    return this.index < this.buffer.length;
  }
  
  public skip(n: number): void {
    /*
     * Function PacketReader.skip
     * Skips a number of bytes from the packet
     */
  
    this.index += n;
  }
  
  private __readSingleSpell(): { id: number; name: string; description: string; icon: Position } {
    return {
      id: this.readUInt8(),
      name: this.readString(),
      description: this.readString(),
      icon: this.readPosition(),
    };
  }
  
  private __readSingleOutfit(): OutfitIdName {
    /*
     * Function PacketReader.readSingleOutfit
     * Reads a single outfit from the packet
     */
  
    return {
      id: this.readUInt16(),
      name: this.readString(),
    };
  }

}
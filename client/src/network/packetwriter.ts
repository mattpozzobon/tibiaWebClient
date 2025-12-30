import Packet from "./packet";

export default class PacketWriter extends Packet {
  public buffer: Uint8Array;

  constructor(opcode: number, length: number) {
    if (opcode === undefined) {
      throw new Error("Opcode is undefined");
    }
    super();
    // Create a packet of the right size (1 extra byte for the opcode).
    this.buffer = new Uint8Array(1 + length);
    // Write the opcode.
    this.writeUInt8(opcode);
  }

  public __writeGenericMove(object: any): void {
    // Generic packet to write a specific location (position, container) and index.
    if (object.which.constructor.name === "Tile") {
      this.writeUInt8(1);
      this.writePosition(object.which.getPosition());
    } else {
      this.writeUInt8(0);
      this.writeUInt16(0);
      this.writeUInt32(object.which.id); // Use container GUID instead of client ID
    }
    this.writeUInt8(object.index);
  }

  public getBuffer(): Uint8Array {
    // If completely full, return the entire buffer.
    if (this.index === this.buffer.length) {
      return this.buffer;
    }
    // Otherwise, return only the written part.
    return this.buffer.subarray(0, this.index);
  }

  public encodeString(str: string): { stringEncoded: Uint8Array; stringLength: number } {
    // Truncate the string if too long.
    if (str.length > 0xFF) {
      str = str.substring(0, 0xFF);
    }
    const stringEncoded = new TextEncoder().encode(str);
    const stringLength = stringEncoded.length + 1;
    return { stringEncoded, stringLength };
  }

  public writeBuffer(buffer: Uint8Array): void {
    // Write the length of the buffer and then its bytes.
    this.writeUInt8(buffer.length);
    this.set(buffer);
  }

  public set(buffer: Uint8Array): void {
    // Writes the entire buffer to the internal buffer.
    this.buffer.set(buffer, this.index);
    this.advance(buffer.length);
  }

  public writeUInt8(value: number): void {
    this.buffer[this.index++] = value;
  }

  public writeUInt16(value: number): void {
    // Write in little-endian order.
    this.buffer[this.index++] = value & 0xff;
    this.buffer[this.index++] = (value >> 8) & 0xff;
  }

  public writeUInt32(value: number): void {
    this.buffer[this.index++] = value & 0xff;
    this.buffer[this.index++] = (value >> 8) & 0xff;
    this.buffer[this.index++] = (value >> 16) & 0xff;
    this.buffer[this.index++] = (value >> 24) & 0xff;
  }

  public writeBoolean(value: boolean): void {
    // Writes a boolean as an UInt8 (1 = true, 0 = false).
    this.writeUInt8(value ? 1 : 0);
  }

  public writePosition(position: { x: number; y: number; z: number }): void {
    // Writes a position to the buffer.
    this.writeUInt16(position.x);
    this.writeUInt16(position.y);
    this.writeUInt16(position.z);
  }

  // Helper method to advance the internal index.
  advance(length: number): void {
    this.index += length;
  }
}

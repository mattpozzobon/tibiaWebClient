"use strict";

export default class Packet {
  index: number;

  constructor() {
    /*
     * Class Packet
     * Container for a packet (writeable or readable)
     */
    this.index = 0;
  }

  public advance(amount: number): void {
    /*
     * Function Packet.advance
     * Advances the packet by a number of bytes
     */
    this.index += amount;
  }
}

import { CONST } from "./helper/appContext";
import PacketWriter from "./packetwriter";

class OutfitChangePacket extends PacketWriter {
  constructor(outfit: { id: number; details: { head: number; body: number; legs: number; feet: number }; mount: number; mounted: boolean; addonOne: boolean; addonTwo: boolean }) {
    super(CONST.PROTOCOL.CLIENT.OUTFIT, 11);
    this.writeUInt16(outfit.id);
    this.writeUInt8(outfit.details.head);
    this.writeUInt8(outfit.details.body);
    this.writeUInt8(outfit.details.legs);
    this.writeUInt8(outfit.details.feet);
    this.writeUInt16(outfit.mount);
    this.writeBoolean(outfit.mounted);
    this.writeBoolean(outfit.addonOne);
    this.writeBoolean(outfit.addonTwo);
  }
}

class ContainerClosePacket extends PacketWriter {
  constructor(id: number) {
    super(CONST.PROTOCOL.CLIENT.CONTAINER_CLOSE, 4);
    this.writeUInt32(id);
  }
}

class ChannelMessagePacket extends PacketWriter {
  constructor(id: number, loudness: number, message: string) {
    const { stringEncoded, stringLength } = new PacketWriter(0, 0).encodeString(message);
    super(CONST.PROTOCOL.CLIENT.CHANNEL_MESSAGE, stringLength + 2);
    this.writeUInt8(id);
    this.writeUInt8(loudness);
    this.writeBuffer(stringEncoded);
  }
}

class ChannelJoinPacket extends PacketWriter {
  constructor(id: number) {
    super(CONST.PROTOCOL.CLIENT.CHANNEL_JOIN, 1);
    this.writeUInt8(id);
  }
}

class ChannelLeavePacket extends PacketWriter {
  constructor(id: number) {
    super(CONST.PROTOCOL.CLIENT.CHANNEL_LEAVE, 1);
    this.writeUInt8(id);
  }
}

class ChannelPrivatePacket extends PacketWriter {
  constructor(name: string, message: string) {
    const encodedName = new PacketWriter(0, 0).encodeString(name);
    const encodedMessage = new PacketWriter(0, 0).encodeString(message);
    super(CONST.PROTOCOL.CLIENT.CHANNEL_PRIVATE_MESSAGE, encodedName.stringLength + encodedMessage.stringLength);
    this.writeBuffer(encodedName.stringEncoded);
    this.writeBuffer(encodedMessage.stringEncoded);
  }
}

class MovementPacket extends PacketWriter {
  constructor(direction: number) {
    super(CONST.PROTOCOL.CLIENT.MOVE, 1);
    this.writeUInt8(direction);
  }
}

class PlayerTurnPacket extends PacketWriter {
  constructor(direction: number) {
    super(CONST.PROTOCOL.CLIENT.TURN, 1);
    this.writeUInt8(direction);
  }
}

class ItemMovePacket extends PacketWriter {
  constructor(fromThing: any, toThing: any, count: number) {
    super(CONST.PROTOCOL.CLIENT.THING_MOVE, 17);
    this.__writeGenericMove(fromThing);
    this.__writeGenericMove(toThing);
    this.writeUInt8(count);
  }
}

class ItemLookPacket extends PacketWriter {
  constructor(thing: any) {
    super(CONST.PROTOCOL.CLIENT.THING_LOOK, 8);
    this.__writeGenericMove(thing);
  }
}

class ItemUsePacket extends PacketWriter {
  constructor(thing: any) {
    super(CONST.PROTOCOL.CLIENT.THING_USE, 8);
    this.__writeGenericMove(thing);
  }
}

class ItemUseWithPacket extends PacketWriter {
  constructor(fromThing: any, toThing: any) {
    super(CONST.PROTOCOL.CLIENT.THING_USE_WITH, 16);
    this.__writeGenericMove(fromThing);
    this.__writeGenericMove(toThing);
  }
}

class TargetPacket extends PacketWriter {
  constructor(id: number) {
    super(CONST.PROTOCOL.CLIENT.TARGET, 4);
    this.writeUInt32(id);
  }
}

class LogoutPacket extends PacketWriter {
  constructor() {
    super(CONST.PROTOCOL.CLIENT.LOGOUT, 0);
  }
}

class KeyringOpenPacket extends PacketWriter {
  constructor() {
    super(CONST.PROTOCOL.CLIENT.OPEN_KEYRING, 0);
  }
}

class FriendRemovePacket extends PacketWriter {
  constructor(string: string) {
    const { stringEncoded, stringLength } = new PacketWriter(0, 0).encodeString(string);
    super(CONST.PROTOCOL.CLIENT.FRIEND_REMOVE, stringLength);
    this.writeBuffer(stringEncoded);
  }
}

class FriendAddPacket extends PacketWriter {
  constructor(string: string) {
    const { stringEncoded, stringLength } = new PacketWriter(0, 0).encodeString(string);
    super(CONST.PROTOCOL.CLIENT.FRIEND_ADD, stringLength);
    this.writeBuffer(stringEncoded);
  }
}

class OfferBuyPacket extends PacketWriter {
  constructor(id: number, offer: number, count: number) {
    super(CONST.PROTOCOL.CLIENT.BUY_OFFER, 6);
    this.writeUInt32(id);
    this.writeUInt8(offer);
    this.writeUInt8(count);
  }
}

class SpellCastPacket extends PacketWriter {
  constructor(id: number) {
    super(CONST.PROTOCOL.CLIENT.CAST_SPELL, 2);
    this.writeUInt16(id);
  }
}

class LatencyPacket extends PacketWriter {
  constructor() {
    super(CONST.PROTOCOL.CLIENT.LATENCY, 0);
  }
}

export { OutfitChangePacket, ContainerClosePacket, ChannelMessagePacket, ChannelJoinPacket, ChannelLeavePacket, ChannelPrivatePacket, MovementPacket, PlayerTurnPacket, ItemMovePacket, ItemLookPacket, ItemUsePacket, ItemUseWithPacket, TargetPacket, LogoutPacket, KeyringOpenPacket, FriendRemovePacket, FriendAddPacket, OfferBuyPacket, SpellCastPacket, LatencyPacket };
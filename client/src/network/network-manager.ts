import { LatencyPacket } from "../core/protocol";
import { CONST } from "../helper/appContext";
import SpriteBuffer from "../renderer/sprite-buffer";
import PacketHandler from "./packet-handler";
import PacketReader from "./packetreader";
// DownloadManager removed - asset download now handled by React components

class NetworkManager {
  socket!: WebSocket;
  state: Record<string, any>;
  nPacketsSent: number = 0;
  latency: number = 0;
  public packetHandler: PacketHandler;

  constructor() {
    this.state = {
      bytesRecv: null,
      bytesSent: null,
      latency: null,
      nPackets: null,
      connected: false,
    };
    this.packetHandler = new PacketHandler();
  }

  close(): void {
    this.socket?.close();
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  readPacket(packet: PacketReader): any {
    this.state.nPackets++;
    const operationCode: number = packet.readUInt8();
    const debug: boolean = true;

    if (debug) {
      try {
        function getNameByNumber(data: any, number: number): string | null {
          for (const [key, value] of Object.entries(data)) {
            if (typeof value === "object") {
              const result = getNameByNumber(value, number);
              if (result) return result;
            } else if (value === number) {
              return key;
            }
          }
          return null;
        }
        const operationName: string = getNameByNumber(CONST.PROTOCOL.SERVER, operationCode) || "Unknown";
        console.log(`Packet Code: ${operationCode} (${operationName})`);
      } catch (error) {
        console.error("Error processing packet:", error);
      }
    }

    switch (operationCode) {
      case CONST.PROTOCOL.SERVER.SPELL_ADD:
        return window.gameClient.interface.updateSpells(packet.readUInt16());
      case CONST.PROTOCOL.SERVER.PLAYER_STATISTICS:
        return this.packetHandler.handlePlayerStatistics(packet.readCharacterStatistics());
      case CONST.PROTOCOL.SERVER.TRADE_OFFER:
        return this.packetHandler.handleTradeOffer(packet.readTradeOffer());
      case CONST.PROTOCOL.SERVER.REMOVE_FRIEND:
        return this.packetHandler.handleRemoveFriend(packet.readString());
      case CONST.PROTOCOL.SERVER.FRIEND_UPDATE:
        return this.packetHandler.handleFriendUpdate(packet.readFriendUpdate());
      case CONST.PROTOCOL.SERVER.ITEM_TRANSFORM:
        return this.packetHandler.handleTransformTile(packet.readTransformTile());
      case CONST.PROTOCOL.SERVER.MESSAGE_CANCEL:
        return this.packetHandler.handleCancelMessage(packet.readString());
      case CONST.PROTOCOL.SERVER.ITEM_INFORMATION:
        return this.packetHandler.handleItemInformation(packet.readItemInformation());
      case CONST.PROTOCOL.SERVER.TARGET:
        return this.packetHandler.handleSetTarget(packet.readUInt32());
      case CONST.PROTOCOL.SERVER.OUTFIT:
        return this.packetHandler.handleChangeOutfit(packet.readChangeOutfit());
      case CONST.PROTOCOL.SERVER.ITEM_TEXT:
        return this.packetHandler.handleReadText(packet.readReadable());
      case CONST.PROTOCOL.SERVER.STATE_SERVER:
        return this.packetHandler.handleServerData(packet);
      case CONST.PROTOCOL.SERVER.CHANNEL_JOIN:
        return this.packetHandler.handleOpenChannel(packet.readOpenChannel());
      case CONST.PROTOCOL.SERVER.COMBAT_LOCK:
        return this.packetHandler.handleCombatLock(packet.readBoolean());
      case CONST.PROTOCOL.SERVER.MAGIC_EFFECT:
        return this.packetHandler.handleSendMagicEffect(packet.readMagicEffect());
      case CONST.PROTOCOL.SERVER.DISTANCE_EFFECT:
        return this.packetHandler.handleSendDistanceEffect(packet.readDistanceEffect());
      case CONST.PROTOCOL.SERVER.CONTAINER_REMOVE:
        return this.packetHandler.handleContainerItemRemove(packet.readContainerItemRemove());
      case CONST.PROTOCOL.SERVER.CREATURE_STATE:
        return this.packetHandler.handleEntityReference(packet.readCreatureInfo());
      case CONST.PROTOCOL.SERVER.CREATURE_INFORMATION:
        return this.packetHandler.handleCharacterInformation(packet.readCharacterInformation());
      case CONST.PROTOCOL.SERVER.CONTAINER_CLOSE:
        return this.packetHandler.handleContainerClose(packet.readUInt32());
      case CONST.PROTOCOL.SERVER.LATENCY:
        return this.packetHandler.handleLatency();
      case CONST.PROTOCOL.SERVER.CREATURE_MOVE:
        return this.packetHandler.handleCreatureServerMove(packet.readEntityMove());
      case CONST.PROTOCOL.SERVER.ITEM_ADD:
        return this.packetHandler.handleItemAdd(packet.readTileItemAdd());
      case CONST.PROTOCOL.SERVER.CONTAINER_OPEN:
        return this.packetHandler.handleContainerOpen(packet.readOpenContainer2());
      case CONST.PROTOCOL.SERVER.CONTAINER_ADD:
        return this.packetHandler.handleContainerAddItem(packet.readContainerItemAdd());
      case CONST.PROTOCOL.SERVER.STATE_PLAYER:
        return this.packetHandler.handleAcceptLogin(packet.readPlayerInfo());
      case CONST.PROTOCOL.SERVER.ITEM_REMOVE:
        return this.packetHandler.handleRemoveItem(packet.readRemoveItem());
      case CONST.PROTOCOL.SERVER.SPELL_CAST:
        return window.gameClient.player!.spellbook.serverCastSpell(packet.readCastSpell());
      case CONST.PROTOCOL.SERVER.CHUNK:
        return this.packetHandler.handleChunk(packet.readChunkData());
      case CONST.PROTOCOL.SERVER.SERVER_ERROR:
        return this.packetHandler.handleServerError(packet.readString());
      case CONST.PROTOCOL.SERVER.MESSAGE_SERVER:
        return this.packetHandler.handleServerMessage(packet.readString());
      case CONST.PROTOCOL.SERVER.CREATURE_REMOVE:
        return this.packetHandler.handleEntityRemove(packet.readUInt32());
      case CONST.PROTOCOL.SERVER.CREATURE_TELEPORT:
        return this.packetHandler.handleEntityTeleport(packet.readCreatureTeleport());

      case CONST.PROTOCOL.SERVER.PLAYER_LOGIN:
        return this.packetHandler.handlePlayerConnect(packet.readString());
      case CONST.PROTOCOL.SERVER.PLAYER_LOGOUT:
        return this.packetHandler.handlePlayerDisconnect(packet.readString());
      case CONST.PROTOCOL.SERVER.WORLD_TIME:
        return this.packetHandler.handleWorldTime(packet.readUInt32());
      case CONST.PROTOCOL.SERVER.TOGGLE_CONDITION:
        return this.packetHandler.handleCondition(packet.readToggleCondition());
      case CONST.PROTOCOL.SERVER.CREATURE_PROPERTY:
        return this.packetHandler.handlePropertyChange(packet.readProperty());

      // Messages 
      case CONST.PROTOCOL.SERVER.EMOTE:
        return this.packetHandler.handleEmote(packet.readDefaultMessage());
      case CONST.PROTOCOL.SERVER.CREATURE_SAY:
        return this.packetHandler.handleDefaultMessage(packet.readDefaultMessage());
      case CONST.PROTOCOL.SERVER.MESSAGE_PRIVATE:
        return this.packetHandler.handleReceivePrivateMessage(packet.readPrivateMessage());
      case CONST.PROTOCOL.SERVER.CREATURE_MESSAGE:
          return this.packetHandler.handleChannelMessage(packet.readChannelMessage());
      default:
        throw new Error("An unknown packet was received from the server.");
    }
  }

  send(packet: any): void {
    console.log('Sending packet:', packet);
    if (!this.isConnected()) return;
    const buffer = packet.getBuffer();
    this.state.bytesSent += buffer.length;
    this.nPacketsSent++;
    this.socket.send(buffer);
  }

  getLatency(): void {
    this.latency = performance.now();
    this.send(new LatencyPacket());
  }

  getConnectionString(response: any): string {
    return `${response.host}?token=${response.token}`;
  }

  getConnectionSettings(): string {
    return "127.0.0.1:1338";
  }

  fetchCallback(response: Response): Promise<ArrayBuffer> {
    if (response.status !== 200) return Promise.reject(response);
    return response.arrayBuffer();
  }

  public openGameSocket(idToken: string): void {
    const loginHostPort = this.getConnectionSettings();
    const httpProtocol = location.protocol === "https:" ? "https:" : "http:";
    const handshakeUrl = `${httpProtocol}//${loginHostPort}/?token=${encodeURIComponent(idToken)}`;
  
    fetch(handshakeUrl, { method: "GET" })
      .then(response => {
        if (!response.ok) throw new Error(`Login handshake failed: ${response.status}`);
        return response.json();
      })
      .then((data: { token: string; gameHost: string; loginHost: string }) => {
        const charactersUrl = `${httpProtocol}//${loginHostPort}/characters?token=${encodeURIComponent(data.token)}`;
        return fetch(charactersUrl)
          .then(res => res.json())
          .then(characters => {
            if (!Array.isArray(characters)) throw new Error("Invalid characters list");
  
            window.gameClient.interface.loginFlowManager.setLoginInfo(
              data.token,
              characters,
              data.loginHost,
              data.gameHost
            );
  
            window.gameClient.interface.loginFlowManager.showPostLogin();
          });
      })
      .catch(err => {
        console.error("openGameSocket error:", err);
        this.__handleError();
      });
  }

  public connectGameServer(host: string, token: string, characterId: number): void {
    const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${host}/?token=${encodeURIComponent(token)}&characterId=${characterId}`;
    console.log("Connecting to game server with character:", wsUrl);

    this.socket = new WebSocket(wsUrl);
    this.socket.binaryType = "arraybuffer";
    this.socket.onopen = this.__handleConnection.bind(this);
    this.socket.onmessage = this.__handlePacket.bind(this);
    this.socket.onclose = this.__handleClose.bind(this);
    this.socket.onerror = this.__handleError.bind(this);
  }

  private __handlePacket(event: MessageEvent): void {
    const packet = new PacketReader(event.data);
    this.state.bytesRecv += packet.buffer.length;
    while (packet.readable()) {
      this.readPacket(packet);
    }
  }

  private __handleError(): void {
    //window.gameClient.interface.modalManager.open("floater-enter");
    const errorBox = document.getElementById("auth-error")!;
    errorBox.textContent = "Could not connect to the Gameworld. Please try again later.";
  }

  private __handleClose(): void {
    console.log("Disconnected");
    if (this.state.connected && window.gameClient.renderer) {
      window.gameClient.reset();
    }
    this.state.connected = false;
  }

  private __handleConnection(): void {
    this.state.connected = true;
    console.log("You are connected to the gameserver.");
  }
}

export default NetworkManager;

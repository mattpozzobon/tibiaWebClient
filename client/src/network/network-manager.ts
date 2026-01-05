import { LatencyPacket } from "../core/protocol";
import { CONST } from "../helper/appContext";
import SpriteBuffer from "../renderer/sprite-buffer";
import PacketHandler from "./packet-handler";
import PacketReader from "./packetreader";
import ApiEndpoints from "../utils/api-endpoints";
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
    const baseUrl = ApiEndpoints.getBaseUrl();
    if (!baseUrl) {
      throw new Error("SERVER_HOST environment variable is not set");
    }
    return baseUrl;
  }
  
  fetchCallback(response: Response): Promise<ArrayBuffer> {
    if (response.status !== 200) return Promise.reject(response);
    return response.arrayBuffer();
  }

  public openGameSocket(idToken: string): void {
    try {
      const baseUrl = this.getConnectionSettings(); // MUST return full base URL e.g. "http://127.0.0.1:1338" or "https://emperia-server.fly.dev"
      console.log("openGameSocket: baseUrl =", baseUrl);
  
      const handshakeUrl = ApiEndpoints.getHandshakeUrl(idToken);
      console.log("openGameSocket: fetching handshake from", handshakeUrl.replace(/\?token=.*/, "?token=..."));
  
      fetch(handshakeUrl, { method: "GET" })
        .then(async r => {
          console.log("openGameSocket: handshake response status =", r.status, r.statusText);
          if (!r.ok) {
            const text = await r.text().catch(() => "");
            console.error("openGameSocket: handshake failed with status", r.status, "response:", text.slice(0, 500));
            throw new Error(`Login handshake failed: ${r.status} ${text.slice(0, 200)}`);
          }
          const data = await r.json();
          console.log("openGameSocket: handshake successful, response data:", { token: data.token ? "present" : "missing", gameHost: data.gameHost, loginHost: data.loginHost });
          return data;
        })
        .then((data: { token: string; gameHost: string; loginHost: string }) => {
          console.log("openGameSocket: handshake successful, fetching characters");
          const charactersUrl = ApiEndpoints.getCharactersUrl(data.token);
          console.log("openGameSocket: fetching characters from", charactersUrl.replace(/\?token=.*/, "?token=..."));
  
          return fetch(charactersUrl)
            .then(async res => {
              console.log("openGameSocket: characters response status =", res.status, res.statusText);
              if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.error("openGameSocket: characters fetch failed with status", res.status, "response:", text.slice(0, 500));
                throw new Error(`Characters fetch failed: ${res.status} ${text.slice(0, 200)}`);
              }
              return res.json();
            })
            .then(characters => {
              if (!Array.isArray(characters)) {
                console.error("openGameSocket: characters response is not an array:", characters);
                throw new Error("Invalid characters list");
              }
              console.log("openGameSocket: characters fetched successfully, count =", characters.length);
  
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
          console.error("openGameSocket error stack:", err.stack);
          this.__handleError();
        });
    } catch (err) {
      console.error("openGameSocket: failed to get connection settings:", err);
      this.__handleError();
    }
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
    console.error("WebSocket error occurred");
    this.__handleDisconnect("Connection error occurred");
  }

  private __handleClose(): void {
    console.log("Disconnected");
    this.__handleDisconnect("Connection closed");
  }

  private __handleDisconnect(reason: string): void {
    this.state.connected = false;
    
    // Dispatch disconnect event to trigger UI reset and destroy
    // The App.tsx handler will call destroy() on the game client
    window.dispatchEvent(new CustomEvent('game-disconnect', { 
      detail: { reason } 
    }));
  }

  private __handleConnection(): void {
    this.state.connected = true;
    console.log("You are connected to the gameserver.");
  }
}

export default NetworkManager;

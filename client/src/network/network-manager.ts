import { LatencyPacket } from "../core/protocol";
import { CONST } from "../helper/appContext";
import SpriteBuffer from "../renderer/sprite-buffer";
import PacketHandler from "./packet-handler";
import PacketReader from "./packetreader";


class NetworkManager {
  socket!: WebSocket;
  state: Record<string, any>;
  public packetHandler: PacketHandler;
  nPacketsSent: number = 0;
  __latency: number = 0;

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

  public readPacket(packet: PacketReader): any {
    // Increase the packet counter.
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
  
    // Determine the operation based on the first byte from the server.
    switch (operationCode) {
      case CONST.PROTOCOL.SERVER.SPELL_ADD: {
        return window.gameClient.interface.updateSpells(packet.readUInt16());
      }
      case CONST.PROTOCOL.SERVER.PLAYER_STATISTICS: {
        return this.packetHandler.handlePlayerStatistics(packet.readCharacterStatistics());
      }
      case CONST.PROTOCOL.SERVER.TRADE_OFFER: {
        return this.packetHandler.handleTradeOffer(packet.readTradeOffer());
      }
      case CONST.PROTOCOL.SERVER.REMOVE_FRIEND: {
        return this.packetHandler.handleRemoveFriend(packet.readString());
      }
      case CONST.PROTOCOL.SERVER.ITEM_TRANSFORM: {
        return this.packetHandler.handleTransformTile(packet.readTransformTile());
      }
      case CONST.PROTOCOL.SERVER.MESSAGE_CANCEL: {
        return this.packetHandler.handleCancelMessage(packet.readString());
      }
      case CONST.PROTOCOL.SERVER.ITEM_INFORMATION: {
        return this.packetHandler.handleItemInformation(packet.readItemInformation());
      }
      case CONST.PROTOCOL.SERVER.TARGET: {
        return this.packetHandler.handleSetTarget(packet.readUInt32());
      }
      case CONST.PROTOCOL.SERVER.OUTFIT: {
        return this.packetHandler.handleChangeOutfit(packet.readChangeOutfit());
      }
      case CONST.PROTOCOL.SERVER.ITEM_TEXT: {
        return this.packetHandler.handleReadText(packet.readReadable());
      }
      case CONST.PROTOCOL.SERVER.STATE_SERVER: {
        return this.packetHandler.handleServerData(packet);
      }
      case CONST.PROTOCOL.SERVER.CHANNEL_JOIN: {
        return this.packetHandler.handleOpenChannel(packet.readOpenChannel());
      }
      case CONST.PROTOCOL.SERVER.COMBAT_LOCK: {
        return this.packetHandler.handleCombatLock(packet.readBoolean());
      }
      case CONST.PROTOCOL.SERVER.MAGIC_EFFECT: {
        return this.packetHandler.handleSendMagicEffect(packet.readMagicEffect());
      }
      case CONST.PROTOCOL.SERVER.DISTANCE_EFFECT: {
        return this.packetHandler.handleSendDistanceEffect(packet.readDistanceEffect());
      }
      case CONST.PROTOCOL.SERVER.CONTAINER_REMOVE: {
        return this.packetHandler.handleContainerItemRemove(packet.readContainerItemRemove());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_STATE: {
        return this.packetHandler.handleEntityReference(packet.readCreatureInfo());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_INFORMATION: {
        return this.packetHandler.handleCharacterInformation(packet.readCharacterInformation());
      }
      case CONST.PROTOCOL.SERVER.CONTAINER_CLOSE: {
        return this.packetHandler.handleContainerClose(packet.readUInt32());
      }
      case CONST.PROTOCOL.SERVER.LATENCY: {
        return this.packetHandler.handleLatency();
      }
      case CONST.PROTOCOL.SERVER.CREATURE_MOVE: {
        return this.packetHandler.handleCreatureServerMove(packet.readEntityMove());
      }
      case CONST.PROTOCOL.SERVER.ITEM_ADD: {
        return this.packetHandler.handleItemAdd(packet.readTileItemAdd());
      }
      case CONST.PROTOCOL.SERVER.CONTAINER_OPEN: {
        return this.packetHandler.handleContainerOpen(packet.readOpenContainer());
      }
      case CONST.PROTOCOL.SERVER.CONTAINER_ADD: {
        return this.packetHandler.handleContainerAddItem(packet.readContainerItemAdd());
      }
      case CONST.PROTOCOL.SERVER.STATE_PLAYER: {
        return this.packetHandler.handleAcceptLogin(packet.readPlayerInfo());
      }
      case CONST.PROTOCOL.SERVER.ITEM_REMOVE: {
        return this.packetHandler.handleRemoveItem(packet.readRemoveItem());
      }
      case CONST.PROTOCOL.SERVER.SPELL_CAST: {
        return window.gameClient.player!.spellbook.serverCastSpell(packet.readCastSpell());
      }
      case CONST.PROTOCOL.SERVER.CHUNK: {
        return this.packetHandler.handleChunk(packet.readChunkData());
      }
      case CONST.PROTOCOL.SERVER.SERVER_ERROR: {
        return this.packetHandler.handleServerError(packet.readString());
      }
      case CONST.PROTOCOL.SERVER.MESSAGE_SERVER: {
        return this.packetHandler.handleServerMessage(packet.readString());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_REMOVE: {
        return this.packetHandler.handleEntityRemove(packet.readUInt32());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_TELEPORT: {
        return this.packetHandler.handleEntityTeleport(packet.readCreatureTeleport());
      }
      case CONST.PROTOCOL.SERVER.MESSAGE_PRIVATE: {
        return this.packetHandler.handleReceivePrivateMessage(packet.readPrivateMessage());
      }
      case CONST.PROTOCOL.SERVER.PLAYER_LOGIN: {
        return this.packetHandler.handlePlayerConnect(packet.readString());
      }
      case CONST.PROTOCOL.SERVER.PLAYER_LOGOUT: {
        return this.packetHandler.handlePlayerDisconnect(packet.readString());
      }
      case CONST.PROTOCOL.SERVER.WORLD_TIME: {
        return this.packetHandler.handleWorldTime(packet.readUInt32());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_MESSAGE: {
        return this.packetHandler.handleChannelMessage(packet.readChannelMessage());
      }
      case CONST.PROTOCOL.SERVER.TOGGLE_CONDITION: {
        return this.packetHandler.handleCondition(packet.readToggleCondition());
      }
      case CONST.PROTOCOL.SERVER.EMOTE: {
        return this.packetHandler.handleEmote(packet.readDefaultMessage());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_SAY: {
        return this.packetHandler.handleDefaultMessage(packet.readDefaultMessage());
      }
      case CONST.PROTOCOL.SERVER.CREATURE_PROPERTY: {
        return this.packetHandler.handlePropertyChange(packet.readProperty());
      }
      default:
        throw new Error("An unknown packet was received from the server.");
    }
  }  

  send(packet: any): void {
    if (!this.isConnected()) return;
    const buffer = packet.getBuffer();
    this.state.bytesSent += buffer.length;
    this.nPacketsSent++;
    this.socket.send(buffer);
  }

  getLatency(): void {
    this.__latency = performance.now();
    this.send(new LatencyPacket());
  }

  getConnectionString(response: any): string {
    return `${response.host}?token=${response.token}`;
  }

  getConnectionSettings(): string {
    return (document.getElementById("host") as HTMLInputElement).value;
  }

  createAccount(options: any): void {
    const host = this.getConnectionSettings();
    const url = `${location.protocol}//${host}/?account=${options.account}&password=${options.password}&name=${options.name}&sex=${options.sex}`;

    fetch(url, { method: "POST" })
      .then((response) => {
        if (response.status !== 201) throw new Error("Account creation failed");
        (document.getElementById("user-username") as HTMLInputElement).value = options.account;
        (document.getElementById("user-password") as HTMLInputElement).value = options.password;
        window.gameClient.interface.modalManager.open("floater-connecting", "The account and character have been created.");
      })
      .catch((err) => window.gameClient.interface.modalManager.open("floater-connecting", err));
  }

  fetchCallback(response: Response): Promise<ArrayBuffer> {
    if (response.status !== 200) return Promise.reject(response);
    return response.arrayBuffer();
  }

  public loadGameFilesServer(): void {
    // The resources to load from the server.
    const resources = ["Tibia.spr", "Tibia.dat"];
  
    // Map each resource to a fetch promise using template literals.
    const promises = resources.map(url =>
      fetch(`/data/${window.gameClient.SERVER_VERSION}/${url}`).then(this.fetchCallback)
    );
  
    // Wait for all resources to load.
    Promise.all(promises)
      .then(([dataSprites, dataObjects]) => {

        window.gameClient.dataObjects.load("Tibia.dat", {target: {result: dataObjects} } as unknown as ProgressEvent<FileReader>);
        SpriteBuffer.load("Tibia.spr", { target: { result: dataSprites } } as unknown as ProgressEvent<FileReader>);
        
      })
      .catch(error => {
        return window.gameClient.interface.modalManager.open(
          "floater-connecting",
          "Failed loading client data from server. Please select them manually using the Load Assets button."
        );
      });
  }
  

  connect(): void {
    const host: string = this.getConnectionSettings();
    const { account, password } = window.gameClient.interface.getAccountDetails();

    // Contact the login server using a template literal.
    fetch(`${location.protocol}//${host}/?account=${account}&password=${password}`)
      .then((response: Response) => {
        switch (response.status) {
          case 200:
            break;
          default:
            break;
        }
        // Proceed with the JSON response.
        return response.json();
      })
      .then((response: any) => {
        // Open the websocket connection: binary transfer of data.
        this.socket = new WebSocket(this.getConnectionString(response));
        this.socket.binaryType = "arraybuffer";

        // Attach callbacks.
        this.socket.onopen = this.__handleConnection.bind(this);
        this.socket.onmessage = this.__handlePacket.bind(this);
        this.socket.onclose = this.__handleClose.bind(this);
        this.socket.onerror = this.__handleError.bind(this);
      })
      .catch((x: any) => window.gameClient.interface.modalManager.open("floater-connecting", x));
  }


  private __handlePacket(event: MessageEvent): void {
    const packet = new PacketReader(event.data);
    this.state.bytesRecv += packet.buffer.length;
    while (packet.readable()) {
      this.readPacket(packet);
    }
  }

  private __handleError(): void {
    window.gameClient.interface.modalManager.open("floater-connecting", new Error("Could not connect to the Gameworld. Please try again later."));
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

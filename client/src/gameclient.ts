import Chunk from "./chunk";
import Creature from "./creature";
import Database from "./database";
import EventQueue from "./event-queue";
import GameLoop from "./game-loop";
import Interface from "./interface";
import Keyboard from "./keyboard";
import Mouse from "./mouse";
import NetworkManager from "./network-manager";
import ObjectBuffer from "./object-buffer";
import Packet from "./packet";
import PacketReader from "./packetreader";
import Player from "./player";
import Renderer from "./renderer";
import SpriteBuffer from "./sprite-buffer";
import World from "./world";


export default class GameClient {
  SERVER_VERSION: string = "1098";
  CLIENT_VERSION: string = "0.0.1";

  spriteBuffer: SpriteBuffer;
  dataObjects: ObjectBuffer;
  keyboard: Keyboard;
  mouse: Mouse;
  networkManager: NetworkManager;
  interface: Interface;
  eventQueue: EventQueue;
  gameLoop: GameLoop;
  player: Player | null = null;
  database: Database;
  world!: World;
  renderer: Renderer;
  private __tickInterval: number = 0;
  serverVersion: number | null = null;
  clientVersion: number | null = null;

  constructor() {
    /*
     * Class GameClient
     * Main container for the HTML5 ForbyJS Game Client
     */

    this.renderer = new Renderer(this);
    this.interface = new Interface(this);
    this.spriteBuffer = new SpriteBuffer(32);
    this.dataObjects = new ObjectBuffer(this);
    this.networkManager = new NetworkManager(this);
    this.database = new Database(this);
    this.gameLoop = new GameLoop(this.__loop.bind(this));
    this.keyboard = new Keyboard(this);
    this.mouse = new Mouse(this);
    this.eventQueue = new EventQueue(this);
    
    document.getElementById("client-version")!.innerHTML = this.CLIENT_VERSION;
  }

  setServerData(packet: PacketReader): void {
    /*
     * Handles event when connected to the gameserver
     */
    let serverData = packet.readServerData();

    if (
      serverData.clientVersion !== this.spriteBuffer.getVersion() ||
      serverData.clientVersion !== this.dataObjects.getVersion()
    ) {
      this.disconnect();
      packet.discard();

      this.interface.modalManager.open(
        "floater-connecting",
        `Server version (${serverData.clientVersion}) mismatch with client sprite (${this.spriteBuffer.getVersion()}) or object (${this.dataObjects.getVersion()}) data.`
      );
    }

    this.interface.enableVersionFeatures(serverData.clientVersion);

    this.__setServerVersion(serverData.version);
    this.__setClientVersion(serverData.clientVersion);

    Chunk.WIDTH = serverData.chunk.width;
    Chunk.HEIGHT = serverData.chunk.height;
    Chunk.DEPTH = serverData.chunk.depth;

    this.world = new World(this, serverData.width, serverData.height, serverData.depth);
    this.world.clock.CLOCK_SPEED = serverData.clock;

    this.__setTickInterval(serverData.tick);

    document.getElementById("anti-aliasing")!.dispatchEvent(new Event("change"));
  }

  getFrame(): number {
    return this.renderer!.debugger.__nFrames;
  }

  isRunning(): boolean {
    return this.gameLoop.isRunning();
  }

  getTickInterval(): number {
    return this.__tickInterval;
  }

  setErrorModal(message: string): void {
    this.interface.modalManager.open("floater-connecting", message);
  }

  reset(): void {
    /*
     * Resets the gameclient for a new connection
     */
    this.renderer.minimap.save();
    this.interface.settings.saveState();
    this.gameLoop.abort();
    this.renderer.screen.clear();

    if (this.player) {
      this.player.closeAllContainers();
      this.player = null;
    }

    this.interface.reset();
  }

  connect(): void {
    if (this.networkManager.isConnected()) return;
    this.networkManager.connect();
  }

  disconnect(): void {
    this.networkManager.close();
  }

  send(buffer: any): void {
    this.networkManager.send(buffer);
  }

  isSelf(creature: Creature): boolean {
    return this.player === creature;
  }

  isSelfID(creature: Creature): boolean {
    return this.player?.id === creature.id;
  }

  getSelfID(): number | undefined {
    return this.player?.id;
  }

  handleAcceptLogin(packet: any): void {
    /*
     * Handles incoming login registration: start the game client
     */
    this.interface.showGameInterface();
    this.interface.modalManager.close();

    this.player = new Player(packet, this);
    this.world.createCreature(packet.id, this.player);
    console.log(this.player);
    this.renderer.updateTileCache();
    this.player.setAmbientSound();
    this.renderer.minimap.setRenderLayer(this.player.getPosition().z);

    this.gameLoop.init();
  }

  isConnected(): boolean {
    return this.networkManager.isConnected();
  }

  hasExtendedAnimations(): boolean {
    /*
     * Returns true if the data object has extended animations
     */
    return this.dataObjects.__version >= 1050;
  }

  private __setServerVersion(version: string): void {
    this.serverVersion = Number(version);
  }

  private __setClientVersion(version: number): void {
    this.clientVersion = Number(version);
  }

  private __setTickInterval(tick: number): void {
    this.__tickInterval = tick;
  }

  private __loop(): void {
    /*
     * Main body of the internal game loop
     */
    this.eventQueue.tick();
    this.interface.soundManager.tick();
    this.keyboard.handleInput();
    this.renderer.render();
  }
}

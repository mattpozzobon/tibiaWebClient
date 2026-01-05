import Chunk from "./chunk";
import Database from "../services/database";
import EventQueue from "./event-queue";
import GameLoop from "./game-loop";
import Interface from "../ui/interface";
import Player from "../game/player/player";
import NetworkManager from "../network/network-manager";
import PacketReader from "../network/packetreader";
import Keyboard from "../input/keyboard";
import Mouse from "../input/mouse";
import Creature from "../game/creature";
import SpriteBuffer from "../renderer/sprite-buffer";
import World from "../game/world";
import Renderer from "../renderer/renderer";
import ObjectBuffer from "./object-buffer";
import { Emitter } from "../utils/event-emitter";

type GCEvents = {
  'gc:ready': GameClient;
  'player:ready': Player;
  'player:updated': Player;
};

export default class GameClient {
  SERVER_VERSION: string = "1098";
  events: Emitter<GCEvents>;
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
  tickInterval: number = 0;
  serverVersion: number | null = null;
  clientVersion: number | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.interface = new Interface(renderer);
    this.spriteBuffer = new SpriteBuffer(100000);
    this.dataObjects = new ObjectBuffer();
    this.networkManager = new NetworkManager();
    this.database = new Database();
    this.gameLoop = new GameLoop(this.__loop.bind(this));
    this.keyboard = new Keyboard();
    this.mouse = new Mouse();
    this.eventQueue = new EventQueue();
    this.events = new Emitter<GCEvents>();

    this.events.emit('gc:ready', this);
  }

  setServerData(packet: PacketReader): void {
    /*
     * Handles event when connected to the gameserver
     */
    let serverData = packet.readServerData();

    if (serverData.clientVersion !== SpriteBuffer.__version || serverData.clientVersion !== this.dataObjects.getVersion()
    ) {
      this.disconnect();
      packet.discard();
    }

    this.__setServerVersion(serverData.version);
    this.__setClientVersion(serverData.clientVersion);

    Chunk.WIDTH = serverData.chunk.width;
    Chunk.HEIGHT = serverData.chunk.height;
    Chunk.DEPTH = serverData.chunk.depth;

    this.world = new World(serverData.width, serverData.height, serverData.depth);
    this.world.clock.CLOCK_SPEED = serverData.clock;

    this.__setTickInterval(serverData.tick);

    //document.getElementById("anti-aliasing")!.dispatchEvent(new Event("change"));
  }

  getFrame(): number {
    return this.renderer!.debugger.__nFrames;
  }

  isRunning(): boolean {
    return this.gameLoop.isRunning();
  }

  getTickInterval(): number {
    return this.tickInterval;
  }


  destroy(): void {
    /*
     * Fully destroys the game client and all its resources
     * This should be called before creating a new GameClient instance
     */
    // Abort game loop
    this.gameLoop.abort();
    
    // Disconnect network
    this.disconnect();
    
    // Clear player
    if (this.player) {
      this.player.closeAllContainers();
      this.player = null;
    }
    
    // Clear world
    this.world = null as any;
    
    // Reset interface
    this.interface.reset();
    
    // Destroy renderer and PIXI app
    if (this.renderer && this.renderer.app) {
      // Remove all children from stage
      this.renderer.app.stage.removeChildren();
      
      // Destroy the PIXI application
      this.renderer.app.destroy(true, {
        children: true,
        texture: true,
      });
    }
    
    // Clear PIXI texture cache if available
    if (typeof window !== 'undefined' && (window as any).PIXI?.utils?.clearTextureCache) {
      (window as any).PIXI.utils.clearTextureCache();
    }
    
    // Clear window reference
    if ((window as any).gameClient === this) {
      (window as any).gameClient = null;
    }
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
    //this.interface.modalManager.close();

    this.player = Player.create(packet);
    this.world.createCreature(packet.id, this.player);
    console.log(this.player);
    window.gameClient.renderer.tileRenderer.refreshVisibleTiles()
    //this.player.setAmbientSound();
    //this.renderer.minimap.setRenderLayer(this.player.getPosition().z);

    this.gameLoop.init(); 
    this.events.emit('player:ready', this.player);
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
    this.tickInterval = tick;
  }

  private __loop(): void {
    /*
     * Main body of the internal game loop
     */
    this.eventQueue.tick();
    //this.interface.soundManager.tick();
    this.keyboard.handleInput();
    this.renderer.render();
  }
}

import Canvas from "./canvas";
import ChannelManager from "./channel-manager";
import HotbarManager from "./hotbar-manager";
import MenuManager from "./menu-manager";
import ModalManager from "./modal-manager";
import OutfitModal from "./modal-outfit";
import NotificationManager from "./notification";
import { KeyringOpenPacket, LogoutPacket } from "./protocol";
import ScreenElementManager from "./screen-element-manager";
import Settings from "./settings";
import SoundManager from "./sound-manager";
import SpriteBuffer from "./sprite-buffer";
import spriteBuffer from "./sprite-buffer";
import State from "./state";
import WindowManager from "./window-manager";

export default class Interface {
  settings: Settings;
  channelManager: ChannelManager;
  hotbarManager: HotbarManager;
  notificationManager: NotificationManager;
  modalManager: ModalManager;
  //statusBar: StatusBar;
  windowManager: WindowManager;
  soundManager: SoundManager;
  menuManager: MenuManager;
  screenElementManager: ScreenElementManager;
  state: State;
  static readonly SCREEN_WIDTH_MIN = 864;
  static readonly SCREEN_HEIGHT_MIN = 416;
  static readonly TILE_SIZE = 32;
  static readonly TILE_WIDTH = 27;
  static readonly TILE_HEIGHT = 13;

  static COLORS: { [key: string]: number } = {
    "BLACK": 0,
    "BLUE": 5,
    "LIGHTGREEN": 30,
    "LIGHTBLUE": 35,
    "MAYABLUE": 95,
    "DARKRED": 108,
    "LIGHTGREY": 129,
    "SKYBLUE": 143,
    "PURPLE": 155,
    "RED": 180,
    "ORANGE": 198,
    "YELLOW": 210,
    "WHITE": 215,
  };

  static WEBCOLORS: string[] = [
    "#000000", "#000033", "#000066", "#000099", "#0000CC", "#0000FF", "#003300",
    "#003333", "#003366", "#003399", "#0033CC", "#0033FF", "#006600", "#006633",
    "#006666", "#006699", "#0066CC", "#0066FF", "#009900", "#009933", "#009966",
    "#009999", "#0099CC", "#0099FF", "#00CC00", "#00CC33", "#00CC66", "#00CC99",
    "#00CCCC", "#00CCFF", "#00FF00", "#00FF33", "#00FF66", "#00FF99", "#00FFCC",
    "#00FFFF", "#330000", "#330033", "#330066", "#330099", "#3300CC", "#3300FF",
    "#333300", "#333333", "#333366", "#333399", "#3333CC", "#3333FF", "#336600",
    "#336633", "#336666", "#336699", "#3366CC", "#3366FF", "#339900", "#339933",
    "#339966", "#339999", "#3399CC", "#3399FF", "#33CC00", "#33CC33", "#33CC66",
    "#33CC99", "#33CCCC", "#33CCFF", "#33FF00", "#33FF33", "#33FF66", "#33FF99",
    "#33FFCC", "#33FFFF", "#660000", "#660033", "#660066", "#660099", "#6600CC",
    "#6600FF", "#663300", "#663333", "#663366", "#663399", "#6633CC", "#6633FF",
    "#666600", "#666633", "#666666", "#666699", "#6666CC", "#6666FF", "#669900",
    "#669933", "#669966", "#669999", "#6699CC", "#6699FF", "#66CC00", "#66CC33",
    "#66CC66", "#66CC99", "#66CCCC", "#66CCFF", "#66FF00", "#66FF33", "#66FF66",
    "#66FF99", "#66FFCC", "#66FFFF", "#990000", "#990033", "#990066", "#990099",
    "#9900CC", "#9900FF", "#993300", "#993333", "#993366", "#993399", "#9933CC",
    "#9933FF", "#996600", "#996633", "#996666", "#996699", "#9966CC", "#9966FF",
    "#999900", "#999933", "#999966", "#999999", "#9999CC", "#9999FF", "#99CC00",
    "#99CC33", "#99CC66", "#99CC99", "#99CCCC", "#99CCFF", "#99FF00", "#99FF33",
    "#99FF66", "#99FF99", "#99FFCC", "#99FFFF", "#CC0000", "#CC0033", "#CC0066",
    "#CC0099", "#CC00CC", "#CC00FF", "#CC3300", "#CC3333", "#CC3366", "#CC3399",
    "#CC33CC", "#CC33FF", "#CC6600", "#CC6633", "#CC6666", "#CC6699", "#CC66CC",
    "#CC66FF", "#CC9900", "#CC9933", "#CC9966", "#CC9999", "#CC99CC", "#CC99FF",
    "#CCCC00", "#CCCC33", "#CCCC66", "#CCCC99", "#CCCCCC", "#CCCCFF", "#CCFF00",
    "#CCFF33", "#CCFF66", "#CCFF99", "#CCFFCC", "#CCFFFF", "#FF0000", "#FF0033",
    "#FF0066", "#FF0099", "#FF00CC", "#FF00FF", "#FF3300", "#FF3333", "#FF3366",
    "#FF3399", "#FF33CC", "#FF33FF", "#FF6600", "#FF6633", "#FF6666", "#FF6699",
    "#FF66CC", "#FF66FF", "#FF9900", "#FF9933", "#FF9966", "#FF9999", "#FF99CC",
    "#FF99FF", "#FFCC00", "#FFCC33", "#FFCC66", "#FFCC99", "#FFCCCC", "#FFCCFF",
    "#FFFF00", "#FFFF33", "#FFFF66", "#FFFF99", "#FFFFCC", "#FFFFFF"
  ];

  static SPELLS: Map<number, { name: string; description: string; icon: { x: number; y: number } }> =
    new Map([
      [0, { name: "Cure Burning", description: "Cures Burning Condition", icon: { x: 0, y: 0 } }],
      [1, { name: "Explosion", description: "Causes an Explosion", icon: { x: 0, y: 4 } }],
      [2, { name: "Healing", description: "Heal Damage", icon: { x: 2, y: 0 } }],
      [3, { name: "Invisibilis", description: "Turn Invisible for 60s.", icon: { x: 10, y: 7 } }],
      [4, { name: "Morph", description: "Morphs into a Creature", icon: { x: 9, y: 9 } }],
      [5, { name: "Parva Lux", description: "Surround yourself by light", icon: { x: 8, y: 9 } }],
      [7, { name: "Hearthstone", description: "Teleport yourself to the temple.", icon: { x: 3, y: 3 } }],
      [8, { name: "Velocitas", description: "Increases your movement speed", icon: { x: 4, y: 8 } }],
      [9, { name: "Levitate", description: "Move up or down a mountain", icon: { x: 4, y: 10 } }],
    ]);

  constructor() {
    
    this.settings = new Settings( this);
    this.channelManager = new ChannelManager();
    this.hotbarManager = new HotbarManager();
    this.notificationManager = new NotificationManager();
    this.modalManager = new ModalManager();
    //this.statusBar = new StatusBar();
    this.windowManager = new WindowManager();
    this.soundManager = new SoundManager( this.settings.isSoundEnabled());
    this.menuManager = new MenuManager();
    this.screenElementManager = new ScreenElementManager();
    this.state = new State();
    
    this.state.add("spritesLoaded", this.enableEnterGame.bind(this));
    this.state.add("dataLoaded", this.enableEnterGame.bind(this));

    //(document.getElementById("chat-input") as HTMLInputElement).disabled = true;

    this.addAvailableResolutions();

    document.getElementById("keyring")?.addEventListener("click", this.__openKeyRing.bind(this));
    this.__enableListeners();
  }

  getSpell(id: number) {
    return Interface.SPELLS.get(id) ?? { name: "Unknown", description: "Unknown", icon: { x: 6, y: 10 } };
  }

  updateSpells(sid: number): void {
    window.gameClient.player?.spellbook.addSpell(sid);
  }

  __openKeyRing(): void {
    window.gameClient.send(new KeyringOpenPacket());
  }

  enableVersionFeatures(version: number): void {
    if (version <= 1000) {
      (this.modalManager.get("outfit-modal") as OutfitModal)?.disableAddons();
    }
  }

  getHexColor(index: number): string {
    return Interface.WEBCOLORS[index] || "#FFFFFF";
  }

  getAccountDetails(): { account: string; password: string } {
    return {
      account: (document.getElementById("user-username") as HTMLInputElement).value.trim(),
      password: (document.getElementById("user-password") as HTMLInputElement).value.trim(),
    };
  }

  enterGame(): void {
    if (!this.areAssetsLoaded()) {
      alert("The Tibia.spr and Tibia.dat must be loaded first.");
      return;
    }
    this.modalManager.open("floater-connecting", "Connecting to Gameworld...");
    window.gameClient.connect();
  }

  reset(): void {
    this.screenElementManager.clear();
    this.windowManager.closeAll();
    this.hideGameInterface();
  }

  enableEnterGame(): void {
    if (this.areAssetsLoaded()) {
      document.getElementById("enter-game")?.removeAttribute("disabled");
    }
  }

  loadAssetsDelegator(): void {
    document.getElementById("asset-selector")?.click();
  }

  areAssetsLoaded(): boolean {
    return Boolean(this.state.spritesLoaded && this.state.dataLoaded);
  }

  showModal(id: string): void {
    this.modalManager.open(id);
  }

  toggleWindow(which: string): void {
    this.windowManager.getWindow(which)?.toggle();
  }

  setCancelMessage(message: string): void {
    this.notificationManager.setCancelMessage(message);
  }

  hideGameInterface(): void {
    document.getElementById("login-wrapper")!.style.display = "flex";
    document.getElementById("game-wrapper")!.style.display = "none";
    window.onresize?.(new UIEvent("resize"));
  }

  showGameInterface(): void {
    document.getElementById("login-wrapper")!.style.display = "none";
    document.getElementById("game-wrapper")!.style.display = "flex";
    window.onresize?.(new UIEvent("resize"));
  }

  loadGameFiles(event: Event): void {
    console.log('LOAD FROM INTERFACE');
    const target = event.target as HTMLInputElement;
    if (!target.files) return;
    
    Array.from(target.files).forEach((file) => {
      console.debug(`Loading asset ${file.name} from disk.`);
      const reader = new FileReader();
      if (file.name === "Tibia.dat") {
        reader.addEventListener("load", (e) => window.gameClient.dataObjects.load(file.name, e));
      } else if (file.name === "Tibia.spr") {
        reader.addEventListener("load", (e) => spriteBuffer.load(file.name, e));
      } else {
        console.error(`Unknown asset file ${file.name} was selected.`);
        return;
      }
      reader.readAsArrayBuffer(file);
    });
  }

  loadAssetCallback(which: string, filename: string): void {
    if (which === "sprite") {
      this.state.spritesLoaded = true;
      const element = document.getElementById("sprites-loaded");
      if (element) {
        element.style.color = "green";
        element.innerHTML = `${filename} (${SpriteBuffer.__version})`;
      }
    } else if (which === "data") {
      this.state.dataLoaded = true;
      const element = document.getElementById("data-loaded");
      if (element) {
        element.style.color = "green";
        element.innerHTML = `${filename} (${window.gameClient.dataObjects.__version})`;
      }
    }
  }

  requestFullScreen(): void {
    const element = document.body as any;
    const requestMethod =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen;
    
    if (requestMethod) {
      requestMethod.call(element);
    }
  }

  isRaining(): boolean {
    return window.gameClient.renderer.weatherCanvas.isRaining();
  }

  getSpriteScaling(): number {
    return 32 * this.getResolutionScale();
  }

  addAvailableResolutions(): void {
    const selectElement = document.getElementById("resolution") as HTMLSelectElement;
    const resolutions = [
      { width: 800, height: 600 },
      { width: 960, height: 720 },
      { width: 1024, height: 768 },
      { width: 1152, height: 864 },
    ];

    const nodes = [this.__createResolutionNode({ width: 480, height: 352 })];
    for (const resolution of resolutions) {
      const { width, height } = resolution;
      const viewport = window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight };
      if (viewport.width - 360 < width || viewport.height - 188 < height) {
        break;
      }
      nodes.push(this.__createResolutionNode(resolution));
    }

    selectElement.replaceChildren(...nodes);
    selectElement.selectedIndex = selectElement.options.length - 1;
  }

  getResolutionScale(): number {
    const viewport = window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight };
    const scaleX = (viewport.width) / Interface.SCREEN_WIDTH_MIN;
    const scaleY = (viewport.height) / Interface.SCREEN_HEIGHT_MIN;
    return Math.min(scaleX, scaleY);
  }

  setElementDimensions(elem: HTMLElement, width: number, height: number): void {
    elem.style.width = `${Math.round(width)}px`;
    elem.style.height = `${Math.round(height)}px`;
  }

  closeClient(event: Event): void {
    // Save the minimap
    //window.gameClient.renderer.minimap.save();

    // Save the state of the settings to localstorage
    this.settings.saveState();
  }

  sendLogout(): void {
    this.modalManager.open("confirm-modal", () => {
      // Block logout in no-logout zones.
      if (window.gameClient.player!.getTile().isNoLogoutZone()) {
        return window.gameClient.interface.setCancelMessage("You may not logout here.");
      }
      window.gameClient.send(new LogoutPacket());
    });
  }

  openOptions(): void {
    this.modalManager.open("settings-modal");
  }

  openCharactherStatus(): void {
    this.modalManager.open("skill-modal");
  }

  openFriendsList(): void {
    this.modalManager.open("friend-modal");
  }

  openOutfit(): void {
    this.modalManager.open("outfit-modal");
  }

  handleResize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
  
    const scaleX = screenWidth / (Interface.TILE_WIDTH * Interface.TILE_SIZE);
    const scaleY = screenHeight / (Interface.TILE_HEIGHT * Interface.TILE_SIZE);
  
    const scale = Math.min(scaleX, scaleY); // prevent overflow
    window.gameClient.renderer.screen.setScale(scale);
  }
  
  __handleStackResize(): void {
    // Get all elements with the class "column".
    const columns = Array.from(document.getElementsByClassName("column"));
  
    // Use visualViewport.height if available, otherwise fallback to window.innerHeight.
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  
    for (const stack of columns) {
      // If there are no child elements in this stack, exit the function.
      if (stack.children.length === 0) return;
  
      // Get the last child element.
      const last = stack.children[stack.children.length - 1] as HTMLElement;
  
      // If the last element has the class "prototype window"
      if (last.className === "prototype window") {
        const bounding = last.getBoundingClientRect();
        // If the bottom of the element is below the viewport height, close the corresponding container.
        if (bounding.bottom >= viewportHeight) {
          const containerIndex = Number(last.getAttribute("containerIndex"));
          window.gameClient.player!.getContainer(containerIndex).close();
        }
      }
    }
  }

  __createResolutionNode({ width, height }: any): HTMLOptionElement {
    const optionElement = document.createElement("option");
    // Using template literals to create the display string.
    optionElement.text = `${width} × ${height}`;
    // Store width as the value (converted to string).
    optionElement.value = width.toString();
    return optionElement;
  }


  __handleVisibiliyChange(event: Event): void {
    if (!window.gameClient.networkManager.isConnected()) {
      return;
    }
    // Disable the keyboard when tabbing out to prevent stuck keys.
    window.gameClient.keyboard.setInactive();
    window.gameClient.renderer.__handleVisibiliyChange(event);
  }

  __handleResizeWindow(): void {
    // Re-calculate available game screen resolutions.
    this.addAvailableResolutions();

    // Handle resizing of the game screen.
    this.handleResize();
  }

  /**
   * Asks the client to confirm the browser close when connected.
   * @returns True if confirmation is needed, otherwise undefined.
   */
  __closeClientConfirm(event: Event): boolean | void {
    if (window.gameClient.isConnected()) {
      return true;
    }
    return;
  } 

  private __enableListeners(): void {
    document.getElementById("openSkills")?.addEventListener("click", () => this.toggleWindow("skill-window"));
    document.getElementById("openBattle")?.addEventListener("click", () => this.toggleWindow("battle-window"));
    document.getElementById("openFriends")?.addEventListener("click", () => this.toggleWindow("friend-window"));
    document.getElementById("logout-button")?.addEventListener("click", () => this.sendLogout());
    document.getElementById("load-assets")?.addEventListener("click", () => this.loadAssetsDelegator());
    document.getElementById("asset-selector")?.addEventListener("change", (event) => this.loadGameFiles(event));
    document.getElementById("enter-game")?.addEventListener("click", () => this.enterGame());
    window.onbeforeunload = () => window.gameClient.isConnected() ? true : undefined;
    //window.onunload = () => window.gameClient.renderer.minimap.save();
    window.onresize = () => this.handleResize();
  }
}
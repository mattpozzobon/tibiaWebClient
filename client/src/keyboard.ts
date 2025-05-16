import { CONST } from "./helper/appContext";
import { MovementPacket, PlayerTurnPacket, TargetPacket } from "./protocol";

class Keyboard {
  private __activeKeys: Set<string> = new Set();

  static readonly KEYS: Record<string, string> = {
    TAB: "tab",
    ENTER: "enter",
    SHIFT: "shift",
    CONTROL: "control",
    ESC: "escape",
    SPACE: " ",
    KEYPAD_9: "pageup",
    KEYPAD_3: "pagedown",
    KEYPAD_1: "end",
    KEYPAD_7: "home",
    LEFT_ARROW: "arrowleft",
    UP_ARROW: "arrowup",
    RIGHT_ARROW: "arrowright",
    DOWN_ARROW: "arrowdown",
  
    // Alphabet
    KEY_A: "a",
    KEY_B: "b",
    KEY_C: "c",
    KEY_D: "d",
    KEY_E: "e",
    KEY_F: "f",
    KEY_G: "g",
    KEY_H: "h",
    KEY_I: "i",
    KEY_J: "j",
    KEY_K: "k",
    KEY_L: "l",
    KEY_M: "m",
    KEY_N: "n",
    KEY_O: "o",
    KEY_P: "p",
    KEY_Q: "q",
    KEY_R: "r",
    KEY_S: "s",
    KEY_T: "t",
    KEY_U: "u",
    KEY_V: "v",
    KEY_W: "w",
    KEY_X: "x",
    KEY_Y: "y",
    KEY_Z: "z",
  
    // Function keys
    F1: "f1",
    F2: "f2",
    F3: "f3",
    F4: "f4",
    F5: "f5",
    F6: "f6",
    F7: "f7",
    F8: "f8",
    F9: "f9",
    F10: "f10",
    F11: "f11",
    F12: "f12",
  };
  

  constructor() {
    document.addEventListener("keydown", this.__keyDown);
    document.addEventListener("keyup", this.__keyUp);
  }

  setInactive(): void {
    this.__activeKeys.clear();
  }

  isShiftDown(): boolean {
    return this.__activeKeys.has(Keyboard.KEYS.SHIFT);
  }

  isControlDown(): boolean {
    return this.__activeKeys.has(Keyboard.KEYS.CONTROL);
  }

  handleInput(): void {
    this.__activeKeys.forEach((key) => {
      window.gameClient.world.pathfinder.setPathfindCache(null);

      if (!window.gameClient.player!.__serverWalkConfirmation) return;

      if (window.gameClient.player!.isMoving()) {
        return window.gameClient.player!.extendMovementBuffer(key);
      }

      if (this.isShiftDown()) {
        return this.__handleCharacterRotate(key);
      }

      this.handleCharacterMovement(key);
    });
  }

  handleCharacterMovement(key: string): void {
    const position = window.gameClient.player!.getPosition();
    switch (key) {
      case Keyboard.KEYS.KEYPAD_7:
        this.__move(CONST.DIRECTION.NORTHWEST, position.northwest());
        break;
      case Keyboard.KEYS.KEYPAD_9:
        this.__move(CONST.DIRECTION.NORTHEAST, position.northeast());
        break;
      case Keyboard.KEYS.KEYPAD_1:
        this.__move(CONST.DIRECTION.SOUTHWEST, position.southwest());
        break;
      case Keyboard.KEYS.KEYPAD_3:
        this.__move(CONST.DIRECTION.SOUTHEAST, position.southeast());
        break;
      case Keyboard.KEYS.LEFT_ARROW:
      case Keyboard.KEYS.KEY_A:
        this.__move(CONST.DIRECTION.WEST, position.west());
        break;
      case Keyboard.KEYS.UP_ARROW:
      case Keyboard.KEYS.KEY_W:
        this.__move(CONST.DIRECTION.NORTH, position.north());
        break;
      case Keyboard.KEYS.RIGHT_ARROW:
      case Keyboard.KEYS.KEY_D:
        this.__move(CONST.DIRECTION.EAST, position.east());
        break;
      case Keyboard.KEYS.DOWN_ARROW:
      case Keyboard.KEYS.KEY_S:
        this.__move(CONST.DIRECTION.SOUTH, position.south());
        break;
    }
  }

  private __handleCharacterRotate(key: string): void {
    switch (key) {
      case Keyboard.KEYS.LEFT_ARROW:
      case Keyboard.KEYS.KEY_A:
        this.__setTurn(CONST.DIRECTION.WEST);
        break;
      case Keyboard.KEYS.UP_ARROW:
      case Keyboard.KEYS.KEY_W:
        this.__setTurn(CONST.DIRECTION.NORTH);
        break;
      case Keyboard.KEYS.RIGHT_ARROW:
      case Keyboard.KEYS.KEY_D:
        this.__setTurn(CONST.DIRECTION.EAST);
        break;
      case Keyboard.KEYS.DOWN_ARROW:
      case Keyboard.KEYS.KEY_S:
        this.__setTurn(CONST.DIRECTION.SOUTH);
        break;
    }
  }

  private __move(direction: number, position: any): void {
    if (!window.gameClient.networkManager.packetHandler.handlePlayerMove(position)) return;
    window.gameClient.renderer.updateTileCache();
    window.gameClient.interface.modalManager.close();
    window.gameClient.send(new MovementPacket(direction));
  }

  private __setTurn(direction: number): void {
    if (window.gameClient.player!.getLookDirection() === direction) return;
    window.gameClient.player!.setTurnBuffer(direction);
    window.gameClient.send(new PlayerTurnPacket(direction));
  }

  private __setChatOpacity(value: number): void {
    const wrapper = document.querySelector(".chatbox-wrapper") as HTMLElement;
    if (wrapper) wrapper.style.opacity = `${value}`;
  }
  
  private __handleReturnKey(): void {
    const modalManager = window.gameClient.interface.modalManager;
    const input = window.gameClient.interface.channelManager;
  
    if (!modalManager.isOpened() && !window.gameClient.isConnected()) {
      modalManager.open("floater-enter");
      window.gameClient.interface.enterGame();
      return;
    }
  
    if (modalManager.isOpened()) {
      modalManager.handleConfirm();
      return;
    }
  
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;
  
    if (input.isDisabled()) {
      input.toggleInputLock();
      this.__setChatOpacity(1); // fully visible when active
      return;
    }
  
    // Send message, then lock input again
    input.handleMessageSend();
    input.toggleInputLock();
    this.__setChatOpacity(0.6); // fade out when not typing
  }

  private __handleEscapeKey(): void {
    if (window.gameClient.interface.modalManager.isOpened()) {
      window.gameClient.interface.modalManager.close();
    } else if (window.gameClient.interface.menuManager.isOpened()) {
      window.gameClient.interface.menuManager.close();
    } else if (window.gameClient.player && window.gameClient.player.hasTarget()) {
      window.gameClient.player.setTarget(null);
      window.gameClient.send(new TargetPacket(0));
    }
    window.gameClient.world.pathfinder.setPathfindCache(null);
  }

  private __handleKeyType(key: string): void {
    if (this.isShiftDown() && key === Keyboard.KEYS.UP_ARROW) {
      window.gameClient.interface.channelManager.suggestPrevious();
    }
  }

  private __keyDown = (event: KeyboardEvent): void => {
    // convert event.key to lower case for consistency
    //event.preventDefault();
    const lowerKey = event.key.toLowerCase();

    if (!this.__isConfigured(lowerKey)) return;

    const { code } = event;

    if (lowerKey === Keyboard.KEYS.ENTER) {
      this.__handleReturnKey();
      return;
    }

    if (window.gameClient.isConnected()) {
      if (lowerKey === Keyboard.KEYS.KEY_G && this.isControlDown()) {
        event.preventDefault();
        return window.gameClient.interface.sendLogout();
      }

      if (lowerKey === Keyboard.KEYS.KEY_O && this.isControlDown()) {
        event.preventDefault();
        return window.gameClient.interface.openOptions();
      }

      if (lowerKey === Keyboard.KEYS.KEY_K && this.isControlDown()) {
        event.preventDefault();
        return window.gameClient.interface.openCharactherStatus();
      }

      if (lowerKey === Keyboard.KEYS.KEY_U && this.isControlDown()) {
        event.preventDefault();
        return window.gameClient.interface.openOutfit();
      }

      if (lowerKey === Keyboard.KEYS.KEY_M && this.isControlDown()) {
        event.preventDefault();
        //return window.gameClient.renderer.minimap.openLargeMap();
      }

      if (lowerKey === Keyboard.KEYS.KEY_E && this.isControlDown()) {
        event.preventDefault();
        return window.gameClient.interface.channelManager.closeCurrentChannel();
      }
    }

    // Update cursor on modifier keys
    if (lowerKey === Keyboard.KEYS.SHIFT) {
      this.__activeKeys.add(lowerKey);
      window.gameClient.mouse.setCursor("zoom-in");
      return;
    }
    if (lowerKey === Keyboard.KEYS.CONTROL) {
      this.__activeKeys.add(lowerKey);
      window.gameClient.mouse.setCursor("pointer");
      return;
    }

    if (lowerKey === Keyboard.KEYS.ESC) {
      this.__handleEscapeKey();
      return;
    }

    // Handle function keys F1 - F12 (convert to lower-case)
    if (lowerKey.startsWith("f")) {
      event.preventDefault();
      if (this.isControlDown()) {
        if (lowerKey === Keyboard.KEYS.F8) {
          return window.gameClient.renderer.debugger.toggleStatistics();
        }
        if (lowerKey === Keyboard.KEYS.F12) {
          return window.gameClient.renderer.takeScreenshot(event);
        }
      }
      return window.gameClient.interface.hotbarManager.handleKeyPress(code);
    }

    if (lowerKey === Keyboard.KEYS.TAB && window.gameClient.isConnected()) {
      event.preventDefault();
      return window.gameClient.interface.channelManager.handleChannelIncrement(1);
    }

    // When modal is open, block other inputs
    if (window.gameClient.interface.modalManager.isOpened()) return;

    // If not on main game body, handle key type
    if (document.activeElement !== document.body) {
      this.__handleKeyType(lowerKey);
      return;
    }

    // Otherwise, mark the key as active (using lower-case)
    this.__activeKeys.add(lowerKey);
  };

  private __keyUp = (event: KeyboardEvent): void => {
    const lowerKey = event.key.toLowerCase();

    if (!this.__isConfigured(lowerKey)) return;

    if (lowerKey === Keyboard.KEYS.SHIFT || lowerKey === Keyboard.KEYS.CONTROL) {
      window.gameClient.mouse.setCursor("auto");
    }
    this.__activeKeys.delete(lowerKey);
  };

  private __isConfigured(key: string): boolean {
    return Object.values(Keyboard.KEYS).includes(key);
  }
}

export default Keyboard;

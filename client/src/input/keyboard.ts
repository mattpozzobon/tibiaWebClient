import { MovementPacket, PlayerTurnPacket, TargetPacket } from "../core/protocol";
import { CONST } from "../helper/appContext";
import { isAnyModalOpen, closeAllModals } from "../utils/modalUtils";



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
    
    // Check for diagonal movement with A + D (north-west)
    if (this.__activeKeys.has(Keyboard.KEYS.KEY_A) && this.__activeKeys.has(Keyboard.KEYS.KEY_W)) {
      this.__move(CONST.DIRECTION.NORTHWEST, position.northwest());
      return;
    }

    if (this.__activeKeys.has(Keyboard.KEYS.KEY_A) && this.__activeKeys.has(Keyboard.KEYS.KEY_S)) {
      this.__move(CONST.DIRECTION.SOUTHWEST, position.southwest());
      return;
    }

    if (this.__activeKeys.has(Keyboard.KEYS.KEY_D) && this.__activeKeys.has(Keyboard.KEYS.KEY_S)) {
      this.__move(CONST.DIRECTION.SOUTHEAST, position.southeast());
      return;
    }

    if (this.__activeKeys.has(Keyboard.KEYS.KEY_D) && this.__activeKeys.has(Keyboard.KEYS.KEY_W)) {
      this.__move(CONST.DIRECTION.NORTHEAST, position.northeast());
      return;
    }
    
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
    window.gameClient.renderer.tileRenderer.refreshVisibleTiles();
    window.gameClient.player!.__serverWalkConfirmation = false;
    window.gameClient.send(new MovementPacket(direction));
  }

  private __setTurn(direction: number): void {
    if (window.gameClient.player!.getLookDirection() === direction) return;
    window.gameClient.player!.setTurnBuffer(direction);
    window.gameClient.send(new PlayerTurnPacket(direction));
  }

  private __handleReturnKey(): void {
    // Check if any modal is open first - modals take precedence
    if (isAnyModalOpen()) {
      // Let the modal handle Enter key (modals handle their own Enter key events)
      return;
    }
  
    // Call React chat's handleEnterKey method directly
    if ((window as any).reactChatWindow && (window as any).reactChatWindow.handleEnterKey) {
      (window as any).reactChatWindow.handleEnterKey();
    }
  }

  private __handleEscapeKey(): void {
    // Check if any modal is open first - modals take precedence
    if (isAnyModalOpen()) {
      closeAllModals();
      return;
    }
    
    // Check if chat is active
    const reactChatInput = document.querySelector(".chat-window .chat-input") as HTMLInputElement;
    if (reactChatInput && document.activeElement === reactChatInput) {
      // Chat is focused - let React chat handle Escape
      reactChatInput.blur();
      return;
    }
    
    if (window.gameClient.player && window.gameClient.player.hasTarget()) {
      window.gameClient.player.setTarget(null);
      window.gameClient.send(new TargetPacket(0));
    }
    window.gameClient.world.pathfinder.setPathfindCache(null);
  }

  private __handleKeyType(key: string): void {
    if (this.isShiftDown() && key === Keyboard.KEYS.UP_ARROW) {
      // Message history - let React chat handle this if it's focused
      const reactChatInput = document.querySelector(".chat-window .chat-input") as HTMLInputElement;
      if (reactChatInput && document.activeElement === reactChatInput) {
        // React chat handles message history in its own component
        return;
      }
      // Fallback for other inputs
      // Use ReactChannelManager for channel suggestions
      if ((window as any).reactChannelManager) {
        (window as any).reactChannelManager.suggestPrevious();
      }
    }
  }

  private __keyDown = (event: KeyboardEvent): void => {
    // convert event.key to lower case for consistency
    //event.preventDefault();
    if (!event.key) return; // Skip if key is undefined/null
    
    const lowerKey = event.key.toLowerCase();

    // Check if chat is active - if so, only handle Enter and Escape, block other game actions
    const chatInput = document.querySelector(".chat-window .chat-input") as HTMLInputElement;
    const isChatActive = chatInput && (document.activeElement === chatInput || chatInput.classList.contains('active'));

    // Handle belt hotbar shortcuts (1-3) before other checks if chat is not active
    if (!isChatActive && window.gameClient.isConnected()) {
      const beltHotbar = (window as any).reactBeltHotbar;
      if (beltHotbar && beltHotbar.hasBeltSlots) {
        // Check for number keys 1-3
        const slotIndex = parseInt(lowerKey) - 1;
        if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 3) {
          event.preventDefault();
          beltHotbar.handleSlotClick(slotIndex);
          return;
        }
      }
    }

    if (!this.__isConfigured(lowerKey)) return;

    const { code } = event;

    if (lowerKey === Keyboard.KEYS.ENTER) {
      // Check if any modal is open first - modals take precedence
      if (isAnyModalOpen()) {
        // Let the modal handle Enter - don't prevent default here as modal will handle it
        return;
      }
      this.__handleReturnKey();
      return;
    }

    // If chat is active, block all other game actions except Escape
    if (isChatActive && lowerKey !== Keyboard.KEYS.ESC) {
      return;
    }

    if (window.gameClient.isConnected()) {




      if (lowerKey === Keyboard.KEYS.KEY_M && this.isControlDown()) {
        event.preventDefault();
        //return window.gameClient.renderer.minimap.openLargeMap();
      }

      if (lowerKey === Keyboard.KEYS.KEY_E && this.isControlDown()) {
        event.preventDefault();
        // Use ReactChannelManager for channel closing
        if ((window as any).reactChannelManager) {
          (window as any).reactChannelManager.closeCurrentChannel();
        }
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
      }
      //return window.gameClient.interface.hotbarManager.handleKeyPress(code);
    }

    if (lowerKey === Keyboard.KEYS.TAB && window.gameClient.isConnected()) {
      event.preventDefault();
      // Use ReactChannelManager for channel navigation
      if ((window as any).reactChannelManager) {
        (window as any).reactChannelManager.handleChannelIncrement(1);
      }
    }

    // When modal is open, block other inputs
    //if (window.gameClient.interface.modalManager.isOpened()) return;

    // If not on main game body, handle key type
    if (document.activeElement !== document.body) {
      this.__handleKeyType(lowerKey);
      return;
    }

    // Otherwise, mark the key as active (using lower-case)
    this.__activeKeys.add(lowerKey);
  };

  private __keyUp = (event: KeyboardEvent): void => {
    if (!event.key) return; // Skip if key is undefined/null
    
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

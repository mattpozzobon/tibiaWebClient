import GameClient from "./gameclient";
import { CONST } from "./helper/appContext";
import { MovementPacket, PlayerTurnPacket } from "./protocol";

class Keyboard {
  gameClient: GameClient;
  private __activeKeys: Set<number> = new Set();

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    document.addEventListener("keydown", this.__keyDown.bind(this));
    document.addEventListener("keyup", this.__keyUp.bind(this));
  }

  static readonly KEYS: Record<string, number> = {
    TAB: 9,
    ENTER_KEY: 13,
    SHIFT_KEY: 16,
    CONTROL_KEY: 17,
    ESC: 27,
    SPACE_BAR: 32,
    KEYPAD_9: 33,
    KEYPAD_3: 34,
    KEYPAD_1: 35,
    KEYPAD_7: 36,
    LEFT_ARROW: 37,
    UP_ARROW: 38,
    RIGHT_ARROW: 39,
    DOWN_ARROW: 40,
    KEY_A: 65,
    KEY_D: 68,
    KEY_E: 69,
    KEY_L: 76,
    KEY_M: 77,
    KEY_S: 83,
    KEY_W: 87,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
  };

  setInactive(): void {
    this.__activeKeys.clear();
  }

  isShiftDown(): boolean {
    return this.__activeKeys.has(Keyboard.KEYS.SHIFT_KEY);
  }

  isControlDown(): boolean {
    return this.__activeKeys.has(Keyboard.KEYS.CONTROL_KEY);
  }

  handleInput(): void {
    this.__activeKeys.forEach((key) => {
      this.gameClient.world.pathfinder.setPathfindCache(null);
      if (!this.gameClient.player!.__serverWalkConfirmation) return;
      if (this.gameClient.player!.isMoving()) {
        return this.gameClient.player!.extendMovementBuffer(key);
      }
      if (this.isShiftDown()) {
        return this.__handleCharacterRotate(key);
      }
      this.handleCharacterMovement(key);
    });
  }

  handleCharacterMovement(key: number): void {
    let position = this.gameClient.player!.getPosition();
    switch (key) {
      case Keyboard.KEYS.KEYPAD_7:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.NORTHWEST, position.northwest());
      case Keyboard.KEYS.KEYPAD_9:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.NORTHEAST, position.northeast());
      case Keyboard.KEYS.KEYPAD_1:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.SOUTHWEST, position.southwest());
      case Keyboard.KEYS.KEYPAD_3:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.SOUTHEAST, position.southeast());
      case Keyboard.KEYS.LEFT_ARROW:
      case Keyboard.KEYS.KEY_A:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.WEST, position.west());
      case Keyboard.KEYS.UP_ARROW:
      case Keyboard.KEYS.KEY_W:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.NORTH, position.north());
      case Keyboard.KEYS.RIGHT_ARROW:
      case Keyboard.KEYS.KEY_D:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.EAST, position.east());
      case Keyboard.KEYS.DOWN_ARROW:
      case Keyboard.KEYS.KEY_S:
        return this.__handleCharacterMovementWrapper(CONST.DIRECTION.SOUTH, position.south());
    }
  }

  private __handleCharacterRotate(key: number): void {
    switch (key) {
      case Keyboard.KEYS.LEFT_ARROW:
      case Keyboard.KEYS.KEY_A:
        return this.__setTurn(CONST.DIRECTION.WEST);
      case Keyboard.KEYS.UP_ARROW:
      case Keyboard.KEYS.KEY_W:
        return this.__setTurn(CONST.DIRECTION.NORTH);
      case Keyboard.KEYS.RIGHT_ARROW:
      case Keyboard.KEYS.KEY_D:
        return this.__setTurn(CONST.DIRECTION.EAST);
      case Keyboard.KEYS.DOWN_ARROW:
      case Keyboard.KEYS.KEY_S:
        return this.__setTurn(CONST.DIRECTION.SOUTH);
    }
  }

  private __handleCharacterMovementWrapper(direction: number, position: any): void {
    if (!this.gameClient.networkManager.packetHandler.handlePlayerMove(position)) return;
    this.gameClient.renderer.updateTileCache();
    this.gameClient.interface.modalManager.close();
    this.gameClient.send(new MovementPacket(direction));
  }

  private __setTurn(direction: number): void {
    if (this.gameClient.player!.getLookDirection() === direction) return;
    this.gameClient.player!.setTurnBuffer(direction);
    this.gameClient.send(new PlayerTurnPacket(direction));
  }

  private __keyDown(event: KeyboardEvent): void {
    if (!this.__isConfigured(event.keyCode)) return;
    if (event.keyCode === Keyboard.KEYS.ENTER_KEY) return this.__handleReturnKey();
    if (event.keyCode === Keyboard.KEYS.ESC) return this.__handleEscapeKey();
    this.__activeKeys.add(event.keyCode);
  }

  private __handleReturnKey(): void {
    if (!this.gameClient.interface.modalManager.isOpened() && !this.gameClient.isConnected()) {
      this.gameClient.interface.modalManager.open("floater-enter");
      this.gameClient.interface.enterGame();
    }
  }

  private __handleEscapeKey(): void {
    if (this.gameClient.interface.modalManager.isOpened()) {
      return this.gameClient.interface.modalManager.close();
    }
  }

  private __isConfigured(key: number): boolean {
    return Object.values(Keyboard.KEYS).includes(key);
  }

  private __keyUp(event: KeyboardEvent): void {
    if (!this.__isConfigured(event.keyCode)) return;
    this.__activeKeys.delete(event.keyCode);
  }
}

export default Keyboard;
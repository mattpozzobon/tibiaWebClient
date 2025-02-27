import Container from "./container";
import GameClient from "./gameclient";
import { ItemLookPacket, ItemMovePacket, ItemUsePacket, ItemUseWithPacket } from "./protocol";
import Tile from "./tile";

class Mouse {
  ;
  private __mouseDownObject: any = null;
  private __currentMouseTile: any = null;
  private __multiUseObject: any = null;
  private __leftButtonPressed: boolean = false;
  private __rightButtonPressed: boolean = false;

  constructor() {
    
    document.body.addEventListener("mousedown", this.__handleMouseDown.bind(this));
    document.body.addEventListener("mouseup", this.__handleMouseUp.bind(this));
    document.body.addEventListener("mousemove", this.__handleMouseMove.bind(this));
    document.body.addEventListener("dblclick", this.__handleMouseDoubleClick.bind(this));
    document.body.addEventListener("contextmenu", this.__handleContextMenu.bind(this));
  }

  getCurrentTileHover(): any {
    return this.__currentMouseTile;
  }

  sendItemMove(fromObject: any, toObject: any, count: number): void {
    if (!fromObject || !toObject) return;
    window.gameClient.send(new ItemMovePacket(fromObject, toObject, count));
  }

  setCursor(which: string): void {
    document.body.style.cursor = which;
  }

  getWorldObject(event: MouseEvent): any {
    return {
      which: window.gameClient.renderer.screen.getWorldCoordinates(event),
      index: 0xff,
    };
  }

  look(object: any): void {
    const item = object.which.peekItem(object.index);
    if (object.which instanceof Container && item === null) return;
    window.gameClient.send(new ItemLookPacket(object));
  }

  use(object: any): void {
    const item = object.which.peekItem(object.index);
    if (object.which instanceof Tile) {
      if (object.which.monsters.size !== 0) {
        if (window.gameClient.player!.isInProtectionZone()) {
          return window.gameClient.interface.setCancelMessage("You may not attack from within protection zone.");
        }
        return window.gameClient.world.targetMonster(object.which.monsters);
      }
    }
    if (item !== null && item.isMultiUse()) {
      return this.__setMultiUseItem(object);
    }
    window.gameClient.send(new ItemUsePacket(object));
  }

  private __handleMouseDoubleClick(event: MouseEvent): void {
    if (event.target instanceof HTMLElement && event.target.className === "chat-message") {
      const name = event.target.getAttribute("name");
      if (name !== null) {
        window.gameClient.interface.channelManager.addPrivateChannel(name);
      }
    }
  }

  private __handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    window.gameClient.interface.menuManager.close();
  }

  private __handleMouseMove(event: MouseEvent): void {
    if (!window.gameClient.isRunning()) return;
    this.__currentMouseTile = window.gameClient.renderer.screen.getWorldCoordinates(event);
  }

  private __handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) this.__leftButtonPressed = true;
    if (event.button === 2) this.__rightButtonPressed = true;
    this.__setSelectedObject(event);
  }

  private __handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) this.__leftButtonPressed = false;
    if (event.button === 2) this.__rightButtonPressed = false;
    if (event.target === window.gameClient.renderer.screen.canvas) {
      this.__handleCanvasMouseUp(event);
    }
  }

  private __handleCanvasMouseUp(event: MouseEvent): void {
    if (!this.__mouseDownObject || !this.__mouseDownObject.which) return;
    if (this.__multiUseObject) {
      return this.__handleItemUseWith(this.__multiUseObject, this.__mouseDownObject);
    }
    const toObject = this.getWorldObject(event);
    return this.__bindMoveCallback(this.__mouseDownObject, toObject);
  }

  private __handleItemUseWith(fromObject: any, toObject: any): void {
    window.gameClient.send(new ItemUseWithPacket(fromObject, toObject));
    this.__multiUseObject = null;
    this.setCursor("auto");
  }

  private __bindMoveCallback(fromObject: any, toObject: any): void {
    const item = fromObject.which.peekItem(fromObject.index);
    if (!item) return this.sendItemMove(fromObject, toObject, 1);
    if (!item.isMoveable()) return;
    if (item.isStackable() && window.gameClient.keyboard.isShiftDown()) {
      return this.sendItemMove(fromObject, toObject, 1);
    }
    return this.sendItemMove(fromObject, toObject, item.count);
  }

  private __setMultiUseItem(object: any): void {
    this.setCursor("move");
    this.__multiUseObject = object;
  }

  private __setSelectedObject(event: MouseEvent): void {
    if (event.target === window.gameClient.renderer.screen.canvas) {
      this.__mouseDownObject = this.getWorldObject(event);
    }
  }
}

export default Mouse;

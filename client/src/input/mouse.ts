import { ItemLookPacket, ItemMovePacket, ItemUsePacket, ItemUseWithPacket } from "../core/protocol";
import Container from "../game/container";
import Item from "../game/item";
import Tile from "../game/tile";

class Mouse {
  private __mouseDownObject: any = null;
  private __currentMouseTile: any = null;
  public __multiUseObject: any = null;
  private __leftButtonPressed = false;
  private __rightButtonPressed = false;
  public x = 0;
  public y = 0;

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

  public getCanvasPosition(): { x: number; y: number } {
    const rect = window.gameClient.renderer.app.canvas.getBoundingClientRect();
    return { x: this.x - rect.left, y: this.y - rect.top };
  }

  private isConnected(): boolean {
    return !!window.gameClient.networkManager.isConnected();
  }

  private parseIndex(val: string | null | undefined): number | null {
    if (val == null) return null;
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : null;
  }

  private getAttrInt(el: Element | null, name: string, dataName?: string): number | null {
    if (!el) return null;
    return this.parseIndex(el.getAttribute(name)) ?? (dataName ? this.parseIndex(el.getAttribute(dataName)) : null);
  }

  sendItemMove(fromObject: any, toObject: any, count: number): void {
    if (!fromObject || !toObject) return;
    const safe = Math.max(1, (count | 0));
    window.gameClient.send(new ItemMovePacket(fromObject, toObject, safe));
  }

  setCursor(which: string): void {
    document.body.style.cursor = which;
  }

  public getWorldObject(event: MouseEvent): any {
    return { which: window.gameClient.renderer.getWorldCoordinates(event), index: 0xff };
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
    if (item !== null && item.isMultiUse()) return this.__setMultiUseItem(object);
    window.gameClient.send(new ItemUsePacket(object));
  }

  private __handleMouseDoubleClick(event: MouseEvent): void {
    if (event.target instanceof HTMLElement && event.target.className === "chat-message") {
      const name = event.target.getAttribute("name");
      if (name && (window as any).reactChannelManager) {
        (window as any).reactChannelManager.addPrivateChannel(name);
      }
    }
  }

  private __handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // window.gameClient.interface.menuManager.close();
    const t = event.target as HTMLElement;
    // if (t.className === "hotbar-item") return window.gameClient.interface.menuManager.open("hotbar-menu", event);
    // if (t.id === "chat-text-area" || t.className === "channel-empty") return window.gameClient.interface.menuManager.open("chat-body-menu", event);
    // if (t.parentElement?.id === "chat-text-area" && t.getAttribute("name") !== null) return window.gameClient.interface.menuManager.open("chat-entry-menu", event);
    // if (t.parentElement?.className === "window" && t.parentElement.id === "friend-window") return window.gameClient.interface.menuManager.open("friend-window-menu", event);
    // if (t.className === "friend-entry") return window.gameClient.interface.menuManager.open("friend-list-menu", event);
    // if (t.className.includes("chat-title")) return window.gameClient.interface.menuManager.open("chat-header-menu", event);
  }

  private __handleMouseMove(event: MouseEvent): void {
    if (!window.gameClient.isRunning()) return;
    this.x = event.clientX;
    this.y = event.clientY;
    this.__currentMouseTile = window.gameClient.renderer.getWorldCoordinates(event);
    this.__updateCursorMove(event.target as HTMLElement);
  }

  private __handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) this.__leftButtonPressed = true;
    if (event.button === 2) this.__rightButtonPressed = true;
    if (!this.isConnected()) return;

    if (this.__leftButtonPressed && this.__rightButtonPressed && this.__mouseDownObject) {
      this.look(this.__mouseDownObject);
    }

    // if (window.gameClient.interface.menuManager.isOpened() && (event.target as HTMLElement).tagName !== "BUTTON") {
    //   window.gameClient.interface.menuManager.close();
    // }

    this.__setSelectedObject(event);

    if (!window.gameClient.keyboard.isShiftDown() && !window.gameClient.keyboard.isControlDown() && event.buttons === 1) {
      this.setCursor("grabbing");
    }
  }

  private __handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) this.__leftButtonPressed = false;
    if (event.button === 2) this.__rightButtonPressed = false;
    if (!this.isConnected()) return;

    if (event.button === 2 && !window.gameClient.keyboard.isControlDown()) {
      const obj = this.__mouseDownObject;
      if (obj?.which) this.use(obj);
      return;
    }

    const t = event.target as HTMLElement;
    if (t === window.gameClient.renderer.app.canvas) {
      this.__handleCanvasMouseUp(event);
    } else if (t.className.includes("slot") || t.className === "body" || t.closest(".slot")) {
      this.__handleSlotMouseUp(event);
    }

    this.__mouseDownObject = null;
    this.setCursor("auto");
  }

  private __handleCanvasMouseUp(event: MouseEvent): any {
    if (!this.__mouseDownObject?.which) return;

    if (this.__multiUseObject !== null) {
      return this.__handleItemUseWith(this.__multiUseObject, this.__mouseDownObject);
    }

    const toObject = this.getWorldObject(event);

    if (this.__mouseDownObject.which.constructor.name === "Tile") {
      if (this.__mouseDownObject.which === toObject.which) return this.__handleMouseClick(event);
      if (!this.__mouseDownObject.which.getPosition().besides(window.gameClient.player!.getPosition())) {
        return window.gameClient.interface.setCancelMessage("You have to move closer.");
      }
    }

    return this.__bindMoveCallback(this.__mouseDownObject, toObject);
  }

  private __handleItemUseWith(fromObject: any, toObject: any): void {
    window.gameClient.send(new ItemUseWithPacket(fromObject, toObject));
    this.__multiUseObject = null;
    this.setCursor("auto");
  }

  private __bindMoveCallback(fromObject: any, toObject: any): void {
    if (!fromObject?.which) return;

    const item = fromObject.which.peekItem(fromObject.index);
    if (!item) return this.sendItemMove(fromObject, toObject, 1);
    if (!item.isMoveable()) return;

    const totalCount =
      typeof (item as any).getCount === "function"
        ? (item as any).getCount()
        : typeof (item as any).count === "number"
        ? Math.max(1, (item as any).count)
        : 1;

    if (item.isStackable() && totalCount > 1 && !window.gameClient.keyboard.isShiftDown()) {
      return this.__openMoveItemModal(fromObject, toObject, item);
    }

    if (item.isStackable() && window.gameClient.keyboard.isShiftDown()) {
      return this.sendItemMove(fromObject, toObject, 1);
    }

    return this.sendItemMove(fromObject, toObject, item.isStackable() ? totalCount : 1);
  }

  private __setMultiUseItem(object: any): void {
    this.setCursor("move");
    this.__multiUseObject = object;
  }

  private __openMoveItemModal(fromObject: any, toObject: any, item: Item): void {
    (window as any).reactUIManager.openModal("moveItem", {
      fromObject,
      toObject,
      item: { id: item.id, count: item.count },
      onConfirm: (count: number) => this.sendItemMove(fromObject, toObject, count),
    });
  }

  private __setSelectedObject(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    
    if (t === window.gameClient.renderer.app.canvas) {
      this.__mouseDownObject = this.getWorldObject(event);
    } else if (t.className.includes("slot") || t.className === "body" || t.closest(".slot")) {
      this.__mouseDownObject = this.__getSlotObject(event);
    }
  }

  __handleMouseClick(event: MouseEvent): any {
    if (window.gameClient.keyboard.isShiftDown()) return this.look(this.__mouseDownObject);
    if (this.__multiUseObject !== null) return;
  }

  private __getSlotObject(event: MouseEvent): any | null {
    const target = event.target as HTMLElement;

    const slotEl =
      (target.closest("[slotIndex]") as HTMLElement | null) ||
      (target.closest("[data-slot-index]") as HTMLElement | null) ||
      (target.closest(".slot") as HTMLElement | null);

    const containerEl =
      (target.closest("[containerIndex]") as HTMLElement | null) ||
      (target.closest("[data-container-index]") as HTMLElement | null) ||
      (target.closest("#react-equipment") as HTMLElement | null) ||
      (target.closest(".equipment-container") as HTMLElement | null) ||
      (target.closest(".container") as HTMLElement | null);

    console.log('🔍 __getSlotObject debug:', {
      target: target.tagName,
      targetClass: target.className,
      slotEl: slotEl ? { tagName: slotEl.tagName, slotIndex: slotEl.getAttribute('slotIndex') } : null,
      containerEl: containerEl ? { tagName: containerEl.tagName, containerIndex: containerEl.getAttribute('containerIndex') } : null
    });

    if (!slotEl || !containerEl) return null;

    let slotIndex =
      this.getAttrInt(slotEl, "slotIndex", "data-slot-index") ??
      (() => {
        const probe = (slotEl.id || "") + " " + (slotEl.className || "");
        const m = probe.match(/\bslot[-_]?(\d+)\b/i);
        return m ? parseInt(m[1], 10) : null;
      })();

    let containerIndex =
      this.getAttrInt(containerEl, "containerIndex", "data-container-index") ??
      (containerEl.id === "react-equipment" ? 0 : null);

    if (slotIndex == null || containerIndex == null) return null;

    const container = window.gameClient.player!.getContainer(containerIndex);
    if (!container) return null;

    return { which: container, index: slotIndex };
  }

  private __handleSlotMouseUp(event: MouseEvent): any {
    if (!this.__mouseDownObject?.which) return;

    const toObject = this.__getSlotObject(event);
    if (!toObject) {
      console.log('🔍 __handleSlotMouseUp: No toObject found');
      return;
    }

    if (this.__mouseDownObject.which.constructor.name === "Tile") {
      if (!this.__mouseDownObject.which.getPosition().besides(window.gameClient.player!.getPosition())) return;
    }

    if (this.__mouseDownObject.which instanceof Container) {
      if (this.__mouseDownObject.which === toObject.which && this.__mouseDownObject.index === toObject.index) {
        return this.__handleMouseClick(event);
      }
    }

    return this.__bindMoveCallback(this.__mouseDownObject, toObject);
  }

  private __updateCursorMove(target: HTMLElement): void {
    // Skip if multi-use or mouse down is active
    if (this.__multiUseObject !== null || this.__mouseDownObject !== null) {
      return;
    }
    
    // Check if hovering over a slot
    const slotElement = target.closest(".slot") as HTMLElement;
    if (slotElement) {
      this.setCursor("grab");
      return;
    }

    // Check for items on ground
    const tile = this.getCurrentTileHover();
    if (!tile || tile.items.length === 0) {
      this.setCursor("auto");
      return;
    }

    const item = tile.peekItem(0xff);
    if (item.isPickupable() || item.isMoveable()) {
      this.setCursor("grab");
      return;
    }
    this.setCursor("auto");
  }
}

export default Mouse;

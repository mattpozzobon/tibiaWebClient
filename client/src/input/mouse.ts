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
  private __pendingRightClick: { object: any; timeout: ReturnType<typeof setTimeout> } | null = null;
  public x = 0;
  public y = 0;
  
  // Store bound handlers so we can remove them in destroy()
  private __boundHandlers: {
    mousedown?: (e: MouseEvent) => void;
    mouseup?: (e: MouseEvent) => void;
    mousemove?: (e: MouseEvent) => void;
    dblclick?: (e: MouseEvent) => void;
    contextmenu?: (e: MouseEvent) => void;
    blur?: () => void;
    focus?: () => void;
    visibilitychange?: () => void;
    mouseleave?: () => void;
  } = {};

  constructor() {
    // Bind handlers and store references for cleanup
    this.__boundHandlers.mousedown = this.__handleMouseDown.bind(this);
    this.__boundHandlers.mouseup = this.__handleMouseUp.bind(this);
    this.__boundHandlers.mousemove = this.__handleMouseMove.bind(this);
    this.__boundHandlers.dblclick = this.__handleMouseDoubleClick.bind(this);
    this.__boundHandlers.contextmenu = this.__handleContextMenu.bind(this);
    this.__boundHandlers.blur = this.setInactive.bind(this);
    this.__boundHandlers.focus = this.__handleWindowFocus.bind(this);
    this.__boundHandlers.visibilitychange = this.__handleVisibilityChange.bind(this);
    this.__boundHandlers.mouseleave = this.__handleMouseLeave.bind(this);
    
    // Add event listeners
    document.body.addEventListener("mousedown", this.__boundHandlers.mousedown);
    document.body.addEventListener("mouseup", this.__boundHandlers.mouseup);
    document.body.addEventListener("mousemove", this.__boundHandlers.mousemove);
    document.body.addEventListener("dblclick", this.__boundHandlers.dblclick);
    document.body.addEventListener("contextmenu", this.__boundHandlers.contextmenu);
    
    // Reset mouse state when window loses focus or becomes hidden
    window.addEventListener("blur", this.__boundHandlers.blur);
    window.addEventListener("focus", this.__boundHandlers.focus);
    document.addEventListener("visibilitychange", this.__boundHandlers.visibilitychange);
    document.body.addEventListener("mouseleave", this.__boundHandlers.mouseleave);
  }
  
  destroy(): void {
    // Remove all event listeners
    if (this.__boundHandlers.mousedown) {
      document.body.removeEventListener("mousedown", this.__boundHandlers.mousedown);
    }
    if (this.__boundHandlers.mouseup) {
      document.body.removeEventListener("mouseup", this.__boundHandlers.mouseup);
    }
    if (this.__boundHandlers.mousemove) {
      document.body.removeEventListener("mousemove", this.__boundHandlers.mousemove);
    }
    if (this.__boundHandlers.dblclick) {
      document.body.removeEventListener("dblclick", this.__boundHandlers.dblclick);
    }
    if (this.__boundHandlers.contextmenu) {
      document.body.removeEventListener("contextmenu", this.__boundHandlers.contextmenu);
    }
    if (this.__boundHandlers.blur) {
      window.removeEventListener("blur", this.__boundHandlers.blur);
    }
    if (this.__boundHandlers.focus) {
      window.removeEventListener("focus", this.__boundHandlers.focus);
    }
    if (this.__boundHandlers.visibilitychange) {
      document.removeEventListener("visibilitychange", this.__boundHandlers.visibilitychange);
    }
    if (this.__boundHandlers.mouseleave) {
      document.body.removeEventListener("mouseleave", this.__boundHandlers.mouseleave);
    }
    
    // Clear pending right-click timeout
    if (this.__pendingRightClick) {
      clearTimeout(this.__pendingRightClick.timeout);
      this.__pendingRightClick = null;
    }
    
    // Reset all state
    this.setInactive();
    this.__boundHandlers = {};
  }
  
  setInactive(): void {
    // Reset all mouse state when window loses focus
    this.__leftButtonPressed = false;
    this.__rightButtonPressed = false;
    this.__mouseDownObject = null;
    this.__currentMouseTile = null;
    
    // Clear pending right-click timeout
    if (this.__pendingRightClick) {
      clearTimeout(this.__pendingRightClick.timeout);
      this.__pendingRightClick = null;
    }
    
    // Reset cursor
    this.setCursor("auto");
  }
  
  private __handleWindowFocus(): void {
    // Reset state when window regains focus to ensure clean state
    this.setInactive();
  }
  
  private __handleVisibilityChange(): void {
    if (document.hidden) {
      // Reset state when tab becomes hidden
      this.setInactive();
    }
  }
  
  private __handleMouseLeave(): void {
    // Reset button states when mouse leaves the document
    // This helps when switching windows while holding buttons
    this.__leftButtonPressed = false;
    this.__rightButtonPressed = false;
    
    // Clear pending right-click
    if (this.__pendingRightClick) {
      clearTimeout(this.__pendingRightClick.timeout);
      this.__pendingRightClick = null;
    }
  }

  getCurrentTileHover(): any {
    return this.__currentMouseTile;
  }

  public getCanvasPosition(): { x: number; y: number } {
    const rect = window.gameClient.renderer.app.canvas.getBoundingClientRect();
    return { x: this.x - rect.left, y: this.y - rect.top };
  }

  private isConnected(): boolean {
    return !!window.gameClient?.networkManager?.isConnected();
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
    
    // Track the item being used so we can send it back when writing text
    if (window.gameClient.networkManager.packetHandler) {
      window.gameClient.networkManager.packetHandler.setLastUsedItem(object);
    }
    
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
    const target = event.target as HTMLElement;
    
    // Clear any pending right-click timeout since contextmenu fired
    if (this.__pendingRightClick) {
      clearTimeout(this.__pendingRightClick.timeout);
    }
    
    // Don't prevent default for React components that handle their own context menus
    // (minimap, chat, friends panel, etc.)
    if (target.closest('.minimap-canvas-container') ||
        target.closest('.chat-message') ||
        target.closest('.friends-panel') ||
        target.closest('.context-menu')) {
      // Reset state even if we're not handling it
      this.__mouseDownObject = null;
      this.__rightButtonPressed = false;
      this.__pendingRightClick = null;
      return; // Let React handle it
    }
    
    // For slots (equipment, containers), prevent default to block browser context menu
    // The actual action is already handled in mouseup, so we just need to prevent the menu
    if (target.className.includes("slot") || target.className === "body" || target.closest(".slot")) {
      event.preventDefault();
      // Reset state
      this.__mouseDownObject = null;
      this.__rightButtonPressed = false;
      this.__pendingRightClick = null;
      return;
    }
    
    // For game canvas right-clicks, prevent default and handle it
    if (target === window.gameClient?.renderer?.app?.canvas || target.closest('#game-container')) {
      event.preventDefault();
      
      // Only process if game client exists, is connected and running
      if (!window.gameClient || !this.isConnected() || !window.gameClient.isRunning()) {
        // Reset state even if game isn't ready
        this.__mouseDownObject = null;
        this.__rightButtonPressed = false;
        this.__pendingRightClick = null;
        return;
      }
      
      // Handle right-click action (use item/look at tile)
      if (!window.gameClient.keyboard.isControlDown()) {
        // Use the stored mouse down object from mousedown, or get current position
        const obj = (this.__pendingRightClick?.object || this.__mouseDownObject || this.getWorldObject(event));
        if (obj?.which) {
          this.use(obj);
        }
      }
      
      // Reset state after handling
      this.__mouseDownObject = null;
      this.__rightButtonPressed = false;
      this.__pendingRightClick = null;
    } else {
      // For other elements (like window headers, etc.), prevent default to block browser context menu
      event.preventDefault();
      // Reset state
      this.__mouseDownObject = null;
      this.__rightButtonPressed = false;
      this.__pendingRightClick = null;
    }
  }

  private __handleMouseMove(event: MouseEvent): void {
    if (!window.gameClient?.isRunning()) return;
    this.x = event.clientX;
    this.y = event.clientY;
    this.__currentMouseTile = window.gameClient.renderer.getWorldCoordinates(event);
    this.__updateCursorMove(event.target as HTMLElement);
  }

  private __handleMouseDown(event: MouseEvent): void {
    if (event.button === 0) this.__leftButtonPressed = true;
    if (event.button === 2) this.__rightButtonPressed = true;
    
    // Always set the selected object, even if not connected yet
    // This ensures right-click works when the game is ready
    this.__setSelectedObject(event);
    
    if (!this.isConnected()) return;

    if (this.__leftButtonPressed && this.__rightButtonPressed && this.__mouseDownObject) {
      this.look(this.__mouseDownObject);
    }

    // if (window.gameClient.interface.menuManager.isOpened() && (event.target as HTMLElement).tagName !== "BUTTON") {
    //   window.gameClient.interface.menuManager.close();
    // }

    if (!window.gameClient.keyboard.isShiftDown() && !window.gameClient.keyboard.isControlDown() && event.buttons === 1) {
      this.setCursor("grabbing");
    }
  }

  private __handleMouseUp(event: MouseEvent): void {
    if (event.button === 0) this.__leftButtonPressed = false;
    
    const t = event.target as HTMLElement;
    
    // For right-click on game canvas, don't process here - let contextmenu event handle it
    // This prevents double-firing. But for slots (equipment, containers in windows), 
    // we still need to handle right-click here because they're not in the game canvas
    if (event.button === 2) {
      // If it's a slot (container/equipment window), handle it immediately
      if (t.className.includes("slot") || t.className === "body" || t.closest(".slot")) {
        if (!this.isConnected()) {
          this.__mouseDownObject = null;
          this.__rightButtonPressed = false;
          return;
        }
        
        // Handle right-click on slot (use item)
        if (!window.gameClient.keyboard.isControlDown()) {
          const obj = this.__mouseDownObject;
          if (obj?.which) {
            this.use(obj);
          }
        }
        
        this.__mouseDownObject = null;
        this.__rightButtonPressed = false;
        return;
      }
      
      // For game canvas right-clicks, let contextmenu event handle it
      // Clear any existing pending right-click timeout
      if (this.__pendingRightClick) {
        clearTimeout(this.__pendingRightClick.timeout);
      }
      
      // Set up a fallback: if contextmenu doesn't fire within 200ms, clean up
      const timeoutId = setTimeout(() => {
        if (this.__pendingRightClick) {
          this.__mouseDownObject = null;
          this.__rightButtonPressed = false;
          this.__pendingRightClick = null;
        }
      }, 200);
      
      this.__pendingRightClick = { object: this.__mouseDownObject, timeout: timeoutId };
      this.__rightButtonPressed = false;
      return;
    }
    
    if (!this.isConnected()) {
      this.__mouseDownObject = null;
      return;
    }

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

    // Use instanceof instead of constructor.name (which breaks in minified production builds)
    if (this.__mouseDownObject.which instanceof Tile) {
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
    if (!item) {
      return this.sendItemMove(fromObject, toObject, 1);
    }
    if (!item.isMoveable()) {
      return;
    }

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
    if (!window.gameClient) return;
    
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

    // Use instanceof instead of constructor.name (which breaks in minified production builds)
    if (this.__mouseDownObject.which instanceof Tile) {
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

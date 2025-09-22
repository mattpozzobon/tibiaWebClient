import { ItemLookPacket, ItemMovePacket, ItemUsePacket, ItemUseWithPacket } from "../core/protocol";
import Container from "../game/container";
import Item from "../game/item";
import Tile from "../game/tile";


class Mouse {
  private __mouseDownObject: any = null;
  private __currentMouseTile: any = null;
  public __multiUseObject: any = null;
  private __leftButtonPressed: boolean = false;
  private __rightButtonPressed: boolean = false;
  public x: number = 0; // Add this
  public y: number = 0; // Add this

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
    return {
      x: this.x - rect.left,
      y: this.y - rect.top,
    };
  }
  
  sendItemMove(fromObject: any, toObject: any, count: number): void {
    if (!fromObject || !toObject) {
      console.error('sendItemMove: Missing fromObject or toObject', { fromObject, toObject });
      return;
    }
    const safe = Math.max(1, (count | 0));
    console.log('Sending item move:', { fromObject, toObject, count: safe });
    window.gameClient.send(new ItemMovePacket(fromObject, toObject, safe));
  }

  setCursor(which: string): void {
    document.body.style.cursor = which;
  }

  public getWorldObject(event: MouseEvent): any {
    return {
      which: window.gameClient.renderer.getWorldCoordinates(event),
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
        // Use ReactChannelManager for private channels
        if ((window as any).reactChannelManager) {
          (window as any).reactChannelManager.addPrivateChannel(name);
        }
      }
    }
  }

  private __handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    window.gameClient.interface.menuManager.close();
  
    const target = event.target as HTMLElement;
  
    // If Control is held, open context-specific menus for the game screen.
    // if (window.gameClient.keyboard.isControlDown()) {
    //   window.gameClient.interface.menuManager.close();
    //   if (target.id === "screen") {
    //     const menu = window.gameClient.interface.menuManager.getMenu("screen-menu");
    //     menu.removeDynamicOptions();
    //     const tile = this.getWorldObject(event);
    //     const useButton = menu.element.querySelector("button[action=use]");
    //     if (useButton) {
    //       useButton.innerHTML = "Use";
    //       if (tile !== null && tile.which.items.length > 0) {
    //         if (tile.which.peekItem(0xff).isRotateable()) {
    //           useButton.innerHTML = "Rotate";
    //         } else if (tile.which.peekItem(0xff).isMultiUse()) {
    //           useButton.innerHTML = "Use With";
    //         }
    //       }
    //     }
    //     const monsters = tile.which.monsters;
    //     if (monsters.size > 0) {
    //       const firstMonster = Array.from(monsters)[0];
    //       if (firstMonster.name === window.gameClient.player!.name) {
    //         menu.addOption("outfits", "Outfits");
    //       }
    //     }
    //     return window.gameClient.interface.menuManager.open("screen-menu", event);
    //   }
    // }
  
    // Additional context menu handling based on the target's class or id:
    if (target.className === "hotbar-item") {
      return window.gameClient.interface.menuManager.open("hotbar-menu", event);
    }
    if (target.id === "chat-text-area" || target.className === "channel-empty") {
      return window.gameClient.interface.menuManager.open("chat-body-menu", event);
    }
    if (target.parentElement && target.parentElement.id === "chat-text-area") {
      if (target.getAttribute("name") !== null) {
        return window.gameClient.interface.menuManager.open("chat-entry-menu", event);
      }
    }
    if (target.parentElement && target.parentElement.className === "window") {
      if (target.parentElement.id === "friend-window") {
        return window.gameClient.interface.menuManager.open("friend-window-menu", event);
      }
    }
    if (target.className === "friend-entry") {
      return window.gameClient.interface.menuManager.open("friend-list-menu", event);
    }
    if (target.className.includes("chat-title")) {
      return window.gameClient.interface.menuManager.open("chat-header-menu", event);
    }
  }

  private __handleMouseMove(event: MouseEvent): void {
    if (!window.gameClient.isRunning()) return;
    this.x = event.clientX; 
    this.y = event.clientY;
    this.__currentMouseTile = window.gameClient.renderer.getWorldCoordinates(event);
    // Call __updateCursorMove to update the cursor based on the target element.
    this.__updateCursorMove(event.target as HTMLElement);
  }

  private __handleMouseDown(event: MouseEvent): void {
    // Left/right button pressed
    if (event.button === 0) this.__leftButtonPressed = true; // Left button
    if (event.button === 2) this.__rightButtonPressed = true; // Right button

  
    // Only continue if connected to the game server
    if (!window.gameClient.networkManager.isConnected()) {
      return;
    }

    // Detect simultaneous left + right click and call look() if __mouseDownObject exists
    if (this.__leftButtonPressed && this.__rightButtonPressed) {
      console.log('look', this.__mouseDownObject);
      if (this.__mouseDownObject) {
        this.look(this.__mouseDownObject);
      }
    }
  
    // If a menu is open and the event target isn't a BUTTON, close the menu
    if (
      window.gameClient.interface.menuManager.isOpened() &&
      (event.target as HTMLElement).tagName !== "BUTTON"
    ) {
      window.gameClient.interface.menuManager.close();
    }
  
    // Set the selected object based on the event target
    this.__setSelectedObject(event);
  
    // If neither Shift nor Control is held and the left button is pressed, update the cursor to "grabbing"
    if (
      !window.gameClient.keyboard.isShiftDown() &&
      !window.gameClient.keyboard.isControlDown() &&
      event.buttons === 1
    ) {
      this.setCursor("grabbing");
    }
  }
  

  private __handleMouseUp(event: MouseEvent): void {
    // Left/right button release
    if (event.button === 0) this.__leftButtonPressed = false;
    if (event.button === 2) this.__rightButtonPressed = false;
  
    // Must be connected to the gameserver
    if (!window.gameClient.networkManager.isConnected()) {
      return;
    }
  
    // Mouse right-click use (when control is not held)
    if (event.button === 2 && !window.gameClient.keyboard.isControlDown()) {
      const targetObject = this.__mouseDownObject;
      if (targetObject && targetObject.which) {
        this.use(targetObject);
      }
      return;
    }
  
    // Delegate based on target element
    const target = event.target as HTMLElement;
    if (target === window.gameClient.renderer.app.canvas) {
      this.__handleCanvasMouseUp(event);
    } else if (target.className.includes("slot") || target.className === "body" || target.closest('.slot')) {
      this.__handleSlotMouseUp(event);
    }
  
    // Reset the selected object (if any)
    this.__mouseDownObject = null;
  
    // Reset the cursor if no multi-use object is pending
    this.setCursor("auto");
  }  

  private __handleCanvasMouseUp(event: MouseEvent): any {
    if (this.__mouseDownObject === null || this.__mouseDownObject.which === null) {
      return;
    }
  
    // If an item is already in use, handle the item use with action.
    if (this.__multiUseObject !== null) {
      return this.__handleItemUseWith(this.__multiUseObject, this.__mouseDownObject);
    }
  
    // Get the world object based on the mouse event.
    const toObject = this.getWorldObject(event);
  
    // If the object that was pressed is a Tile, perform extra checks.
    if (this.__mouseDownObject.which.constructor.name === "Tile") {
      // If the down and up objects are the same, treat it as a click.
      if (this.__mouseDownObject.which === toObject.which) {
        return this.__handleMouseClick(event);
      }
  
       // The position where the item is used must be besides the player 
  
      if(!this.__mouseDownObject.which.getPosition().besides(window.gameClient.player!.getPosition())) {
        return window.gameClient.interface.setCancelMessage("You have to move closer.");
      }
    }
  
    // Bind and send the move callback to the server.
    return this.__bindMoveCallback(this.__mouseDownObject, toObject);
  }  

  private __handleItemUseWith(fromObject: any, toObject: any): void {
    window.gameClient.send(new ItemUseWithPacket(fromObject, toObject));
    this.__multiUseObject = null;
    this.setCursor("auto");
  }

  private __bindMoveCallback(fromObject: any, toObject: any): void {
    
    if (!fromObject || !fromObject.which) {
      return;
    }
    
    const item = fromObject.which.peekItem(fromObject.index);
    
    if (!item) {
      return this.sendItemMove(fromObject, toObject, 1);
    }
    
    if (!item.isMoveable()) {
      return;
    }
    
    // Determine total available count safely
    const totalCount: number = typeof (item as any).getCount === 'function'
      ? (item as any).getCount()
      : (typeof (item as any).count === 'number' ? Math.max(1, (item as any).count) : 1);

    // If item is stackable and has more than 1 count, open move item modal
    if (item.isStackable() && totalCount > 1 && !window.gameClient.keyboard.isShiftDown()) {
      return this.__openMoveItemModal(fromObject, toObject, item);
    }
    
    // If shift is held down with stackable items, move only 1
    if (item.isStackable() && window.gameClient.keyboard.isShiftDown()) {
      return this.sendItemMove(fromObject, toObject, 1);
    }
    
    // Move all items (non-stackable or single stackable items)
    const moveCount = item.isStackable() ? totalCount : 1;
    return this.sendItemMove(fromObject, toObject, moveCount);
  }

  private __setMultiUseItem(object: any): void {
    this.setCursor("move");
    this.__multiUseObject = object;
  }

  private __openMoveItemModal(fromObject: any, toObject: any, item: Item): void {
      (window as any).reactUIManager.openModal('moveItem', {
        fromObject,
        toObject,
        item: {
          id: item.id,
          count: item.count
        },
        onConfirm: (count: number) => { 
          console.log('Move item confirmed with count:', count);
          this.sendItemMove(fromObject, toObject, count);
        }
      });
  }

  private __setSelectedObject(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target === window.gameClient.renderer.app.canvas) {
      this.__mouseDownObject = this.getWorldObject(event);
    } else if (target.className.includes("slot") || target.className === "body" || target.closest('.slot')) {
      this.__mouseDownObject = this.__getSlotObject(event);
    }
  }

  __handleMouseClick(event: MouseEvent): any {
    if (window.gameClient.keyboard.isShiftDown()) {
      return this.look(this.__mouseDownObject);
    }

    if (this.__multiUseObject !== null) {
      return;
    }

    // TODO: Fix findPath
    // if (
    //   !window.gameClient.player!.isMoving() &&
    //   this.__mouseDownObject.which.constructor.name === "Tile" &&
    //   !window.gameClient.keyboard.isControlDown() &&
    //   !this.__rightButtonPressed
    // ) {
    //   const worldCoordinates = window.gameClient.renderer.screen.getWorldCoordinates(event);
    //   return window.gameClient.world.pathfinder.findPath(
    //     window.gameClient.player!.__position,
    //     worldCoordinates.__position
    //   );
    // }
  }

  private __getSlotObject(event: MouseEvent): any {
    let slotIndex: number;
    let containerIndex: number;
    const target = event.target as HTMLElement;
  
    // Check if this is an equipment slot first
    if (target.closest('#react-equipment')) {
      slotIndex = Number(target.getAttribute("slotIndex"));
      containerIndex = 0; // Equipment is always container 0
    } else {
      // Read the identifiers from the DOM for regular containers.
      if (target.className === "body") {
        slotIndex = 0;
        containerIndex = Number(target.parentElement?.getAttribute("containerIndex"));
      } else {
        slotIndex = Number(target.getAttribute("slotIndex"));
        containerIndex = Number(target.parentElement?.parentElement?.getAttribute("containerIndex"));
      }
    }
  
    // Fetch the container from the player.
    const container = window.gameClient.player!.getContainer(containerIndex);
  
    // Wrap and return the container and slot index.
    return {
      which: container,
      index: slotIndex,
    };
  }
  

  private __handleSlotMouseUp(event: MouseEvent): any {
    if (this.__mouseDownObject === null || this.__mouseDownObject.which === null) {
      return;
    }
  
    const toObject = this.__getSlotObject(event);
  
    // If moving from the world (a Tile), check that the target position is adjacent to the player.
    if (this.__mouseDownObject.which.constructor.name === "Tile") {
      if (
        !this.__mouseDownObject.which
          .getPosition()
          .besides(window.gameClient.player!.getPosition())
      ) {
        return;
      }
    }
  
    // If moving from a container, and the source and destination are the same, treat it as a click.
    if (this.__mouseDownObject.which instanceof Container) {
      if (
        this.__mouseDownObject.which === toObject.which &&
        this.__mouseDownObject.index === toObject.index
      ) {
        return this.__handleMouseClick(event);
      }
    }
  
    return this.__bindMoveCallback(this.__mouseDownObject, toObject);
  }
  

  private __updateCursorMove(target: HTMLElement): void {
    // If shift or control is held, remove any text selections and exit.
    if (window.gameClient.keyboard.isShiftDown() || window.gameClient.keyboard.isControlDown()) {
      window.getSelection()?.removeAllRanges();
      return;
    }
  
    // Block cursor update when using or dragging an witem.
    if (this.__multiUseObject !== null || this.__mouseDownObject !== null) {
      window.getSelection()?.removeAllRanges();
      return;
    }
  
    // If hovering over a slot (including React equipment slots), set the cursor to "grab"
    if (target.className.includes("slot") || target.closest('.slot')) {
      this.setCursor("grab");
      return;
    }
  
    const tile = this.getCurrentTileHover();
  
    // In gameworld but nothing is there: reset cursor.
    if (tile === null) {
      this.setCursor("auto");
      return;
    }
  
    // If there are no items on the tile, reset cursor.
    if (tile.items.length === 0) {
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

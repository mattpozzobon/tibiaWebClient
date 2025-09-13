import FriendListMenu from "./menu-friend-list";
import FriendWindowMenu from "./menu-friend-window";
import HotbarMenu from "./menu-hotbar";
import ScreenMenu from "./menu-screen";

export interface IMenu {
  open(event: Event): IMenu;
  close(): void;
}

export default class MenuManager {
  public menus: { [name: string]: IMenu };
  private __activeMenu: IMenu | null;

  constructor() {
    // Register the configured menus.
    
    this.menus = {
      //"screen-menu": new ScreenMenu( "screen-menu"),
      // Chat menus removed - now handled by React
      // "chat-header-menu": new ChatHeaderMenu( "chat-header-menu"),
      // "chat-entry-menu": new MessageMenu( "chat-entry-menu"),
      // "chat-body-menu": new ChatBodyMenu( "chat-body-menu"),
      // "friend-list-menu": new FriendListMenu( "friend-list-menu"),
      // "friend-window-menu": new FriendWindowMenu( "friend-window-menu"),
      // "hotbar-menu": new HotbarMenu( "hotbar-menu"),
    };

    // Reference the currently active open menu.
    this.__activeMenu = null;
  }

  public getMenu(name: string): IMenu | null {
    if (!this.menus.hasOwnProperty(name)) {
      return null;
    }
    return this.menus[name];
  }

  public open(name: string, event: Event): void {
    const menuElement = this.getMenu(name);
    if (menuElement === null) {
      return console.error(`Cannot open menu ${name} because the menu has not been registered.`);
    }
    if (this.isOpened()) {
      return console.error(`Cannot open menu ${name} because another menu is already opened.`);
    }
    this.__activeMenu = menuElement.open(event);
  }

  public isOpened(): boolean {
    return this.__activeMenu !== null;
  }

  public close(): void {
    if (!this.isOpened()) {
      return;
    }
    this.__activeMenu!.close();
    this.__activeMenu = null;
    this.__defocus();
  }

  private __defocus(): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}

import GameClient from "./gameclient";
import ChatBodyMenu from "./menu-chat-body";
import ChatHeaderMenu from "./menu-chat-header";
import FriendListMenu from "./menu-friend-list";
import FriendWindowMenu from "./menu-friend-window";
import HotbarMenu from "./menu-hotbar";
import MessageMenu from "./menu-message";
import ScreenMenu from "./menu-screen";

export interface IMenu {
  open(event: Event): IMenu;
  close(): void;
}

export default class MenuManager {
  gameClient: GameClient;
  public menus: { [name: string]: IMenu };
  private __activeMenu: IMenu | null;

  constructor(gameClient: GameClient,) {
    // Register the configured menus.
    this.gameClient = gameClient;
    this.menus = {
      "screen-menu": new ScreenMenu(gameClient, "screen-menu"),
      "chat-header-menu": new ChatHeaderMenu(gameClient, "chat-header-menu"),
      "chat-entry-menu": new MessageMenu(gameClient, "chat-entry-menu"),
      "chat-body-menu": new ChatBodyMenu(gameClient, "chat-body-menu"),
      "friend-list-menu": new FriendListMenu(gameClient, "friend-list-menu"),
      "friend-window-menu": new FriendWindowMenu(gameClient, "friend-window-menu"),
      "hotbar-menu": new HotbarMenu(gameClient, "hotbar-menu"),
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

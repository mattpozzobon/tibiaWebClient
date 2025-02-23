import Menu from "./menu";
import GameClient from "./gameclient";
import { FriendAddPacket } from "./protocol"; // Adjust the import as needed

export default class FriendWindowMenu extends Menu {
  public gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    super(id);
    this.gameClient = gameClient;
  }

  public click = (event: Event): any => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "add":
        return this.openInputModal();
      case "sort-reversed":
        return this.gameClient.player!.friendlist.sortBy("reversed");
      case "sort-normal":
        return this.gameClient.player!.friendlist.sortBy("normal");
      case "hide-offline":
        return this.hideOffline(target);
      default:
        break;
    }
  }

  public hideOffline(target: HTMLElement): void {
    if (target.innerHTML === "Hide Offline") {
      target.innerHTML = "Show Offline";
    } else {
      target.innerHTML = "Hide Offline";
    }
    this.gameClient.player!.friendlist.toggleShowOffline();
  }

  public openInputModal(): any {
    // Pass a dummy MouseEvent if needed (adjust as appropriate)
    const modal = this.gameClient.interface.modalManager.open("enter-name-modal", new MouseEvent("click"));
    if (modal === null) {
      return;
    }
    // Bind the instance method so that `this` refers to the FriendWindowMenu instance.
    // TODO: 
    //return modal.setConfirmCallback(this.addFriend.bind(this));
  }

  public addFriend(friend: string): void {
    if (friend === null || friend === "") {
      return;
    }
    if (this.gameClient.player!.friendlist.has(friend)) {
      return this.gameClient.interface.setCancelMessage("This friend is already in your friendlist.");
    }
    this.gameClient.send(new FriendAddPacket(friend));
  }
}

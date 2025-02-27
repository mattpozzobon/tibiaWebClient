import Menu from "./menu";
import GameClient from "./gameclient";
import { FriendAddPacket } from "./protocol"; // Adjust the import as needed

export default class FriendWindowMenu extends Menu {
  

  constructor(id: string) {
    super(id);
    
  }

  public click = (event: Event): any => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "add":
        return this.openInputModal();
      case "sort-reversed":
        return window.gameClient.player!.friendlist.sortBy("reversed");
      case "sort-normal":
        return window.gameClient.player!.friendlist.sortBy("normal");
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
    window.gameClient.player!.friendlist.toggleShowOffline();
  }

  public openInputModal(): any {
    // Pass a dummy MouseEvent if needed (adjust as appropriate)
    const modal = window.gameClient.interface.modalManager.open("enter-name-modal", new MouseEvent("click"));
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
    if (window.gameClient.player!.friendlist.has(friend)) {
      return window.gameClient.interface.setCancelMessage("This friend is already in your friendlist.");
    }
    window.gameClient.send(new FriendAddPacket(friend));
  }
}

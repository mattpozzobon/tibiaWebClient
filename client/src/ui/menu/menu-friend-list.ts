import Menu from "./menu";
import GameClient from "../../core/gameclient";
import { FriendRemovePacket } from "../../core/protocol";

export default class FriendListMenu extends Menu {
  

  constructor(id: string) {
    super(id);
    
  }

  public removeFriend(target: HTMLElement): boolean {
    const friend = target.getAttribute("friend");
    if (friend === null) {
      return false;
    }
    window.gameClient.send(new FriendRemovePacket(friend));
    return true;
  }

  public click = (event: Event): any => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "remove":
        if (this.downEvent) {
          // Cast downEvent to MouseEvent to access its target.
          const downTarget = (this.downEvent as MouseEvent).target as HTMLElement;
          return this.removeFriend(downTarget);
        }
        break;
      case "note":
        window.gameClient.interface.setCancelMessage("Not implemented.");
        return true;
      default:
        break;
    }
  }
}

import Menu from "./menu";
import GameClient from "./gameclient";
import { FriendRemovePacket } from "./protocol";

export default class FriendListMenu extends Menu {
  public gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    super(id);
    this.gameClient = gameClient;
  }

  public removeFriend(target: HTMLElement): boolean {
    const friend = target.getAttribute("friend");
    if (friend === null) {
      return false;
    }
    this.gameClient.send(new FriendRemovePacket(friend));
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
        this.gameClient.interface.setCancelMessage("Not implemented.");
        return true;
      default:
        break;
    }
  }
}

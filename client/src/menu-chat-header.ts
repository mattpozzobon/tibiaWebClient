import Menu from "./menu";
import GameClient from "./gameclient";

export default class ChatHeaderMenu extends Menu {
  public gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    super(id);
    this.gameClient = gameClient;
  }

  public closeChannel(target: HTMLElement): boolean {
    // Get the channel identifier from the target element's first child.
    const index = target.children[0].innerHTML;
    // Retrieve the channel by index and then close it.
    const channel = this.gameClient.interface.channelManager.getChannel(index);
    if (channel) {
      this.gameClient.interface.channelManager.closeChannel(channel);
    }
    return true;
  }

  public click = (event: Event): any => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "close":
        if (this.downEvent) {
          // Cast downEvent to MouseEvent to access its target.
          const downTarget = (this.downEvent as MouseEvent).target as HTMLElement;
          return this.closeChannel(downTarget);
        }
        break;
      default:
        break;
    }
  }
}
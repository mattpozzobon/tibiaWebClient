import Menu from "./menu";
import GameClient from "./gameclient";

export default class MessageMenu extends Menu {
  public gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    super(id);
    this.gameClient = gameClient;
  }

  public click = (event: Event): any => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "whisper":
        if (this.downEvent) {
          // Cast downEvent to MouseEvent to access its target.
          const downTarget = (this.downEvent as MouseEvent).target as HTMLElement;
          return this.whisper(downTarget);
        }
        break;
      default:
        break;
    }
  }

  public whisper(target: HTMLElement): boolean {
    const name = target.getAttribute("name");
    if (name === null) {
      return false;
    }
    this.gameClient.interface.channelManager.addPrivateChannel(name);
    return true;
  }
}

import Menu from "./menu";
import GameClient from "./gameclient";

export default class ChatBodyMenu extends Menu {
  public gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    super(id);
    this.gameClient = gameClient;
  }

  public click = (event: Event): any =>{
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "clear":
        return this.gameClient.interface.channelManager.clearCurrentChannel();
      default:
        break;
    }
  }
}

import Menu from "./menu";
import GameClient from "../../core/gameclient";

export default class MessageMenu extends Menu {
  

  constructor(id: string) {
    super(id);
    
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
    window.gameClient.interface.channelManager.addPrivateChannel(name);
    return true;
  }
}

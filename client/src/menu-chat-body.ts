import Menu from "./menu";
import GameClient from "./gameclient";

export default class ChatBodyMenu extends Menu {
  

  constructor(id: string) {
    super(id);
    
  }

  public click = (event: Event): any =>{
    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "clear":
        return window.gameClient.interface.channelManager.clearCurrentChannel();
      default:
        break;
    }
  }
}

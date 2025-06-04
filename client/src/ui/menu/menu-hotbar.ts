import Menu from "./menu";
import GameClient from "../../core/gameclient";

export default class HotbarMenu extends Menu {
  private __index: number | null;
  

  constructor(id: string) {
    super(id);
    
    this.__index = null;
  }

  public click = (event: Event): boolean => {
    if (!this.downEvent) return false;
    // Get the index of the element that was the target of the downEvent
    const downTarget = this.downEvent.target as HTMLElement;
    if (!downTarget.parentNode) return false;
    const childrenArray = Array.from(downTarget.parentNode.children);
    const index = childrenArray.indexOf(downTarget);

    const target = event.target as HTMLElement;
    const action = target.getAttribute("action");
    switch (action) {
      case "add":
        // Here we assume that the modal manager's open method can accept a number as second parameter.
        window.gameClient.interface.modalManager.open("spellbook-modal", index as any);
        break;
      case "remove":
        window.gameClient.interface.hotbarManager.clearSlot(index);
        break;
      default:
        break;
    }
    return true;
  }
}

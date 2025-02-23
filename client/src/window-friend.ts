
import Interface from "./interface";
import InteractiveWindow from "./window";

interface FriendEntry {
  name: string;
  online: boolean;
}

export default class FriendWindow extends InteractiveWindow {
  constructor(element: HTMLElement) {
    super(element);
  }

  public generateContent(content: FriendEntry[]): void {
    // Map friend entries to DOM nodes and set the window content.
    const nodes = content.map(this.__createFriendEntry.bind(this));
    this.setContent(nodes);
  }

  private __createFriendEntry(entry: FriendEntry): HTMLElement {
    const div = document.createElement("div");
    // Determine color based on the online status.
    const color = entry.online ? Interface.COLORS.LIGHTGREEN : Interface.COLORS.WHITE;
    div.className = "friend-entry";
    div.setAttribute("friend", entry.name);
    // Use the global Interface's getHexColor method.
    div.style.color = Interface.prototype.getHexColor(color);
    div.innerHTML = entry.name;
    return div;
  }
}

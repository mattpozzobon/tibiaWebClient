import Modal from "./modal";
import GameClient from "./gameclient";

export default class ChatModal extends Modal {
  ;

  constructor(id: string) {
    super(id);
    

    const privateInput = document.getElementById("open-private-channel-input");
    if (privateInput) {
      privateInput.addEventListener("focus", this.__handleFocus.bind(this));
    }

    const channelSelect = document.getElementById("channel-select");
    if (channelSelect) {
      channelSelect.ondblclick = this.__handleDoubleClick.bind(this);
    }
  }

  public handleConfirm = (): boolean => {
    const channel = this.__getSelectedDefaultChannel();
    if (channel.selectedIndex === -1) {
      return this.__handleOpenPrivateChannel();
    }

    const row = channel.options[channel.selectedIndex];
    const type = row.getAttribute("channelType");
    const idAttr = row.getAttribute("channelId");

    if (type === "local") {
      window.gameClient.interface.channelManager.addLocalChannel(idAttr!);
    } else {
      window.gameClient.interface.channelManager.joinChannel(Number(idAttr), channel.value);
    }

    return true;
  }

  private __handleDoubleClick(): void {
    // Simulate a confirm click by calling the inherited __buttonClick method.
    const confirmButton = this.element.querySelector("button[action='confirm']");
    if (confirmButton) {
      // Assuming __buttonClick is defined as a protected method in Modal.
      this.__buttonClick({ target: confirmButton } as unknown as Event);
    }
  }

  private __getSelectedDefaultChannel(): HTMLSelectElement {
    return document.getElementById("channel-select") as HTMLSelectElement;
  }

  private __handleOpenPrivateChannel(): boolean {
    const input = document.getElementById("open-private-channel-input") as HTMLInputElement;
    const playerName = input.value.trim();
    window.gameClient.interface.channelManager.addPrivateChannel(playerName);
    return true;
  }

  private __handleFocus(): void {
    const channelSelect = document.getElementById("channel-select") as HTMLSelectElement;
    if (channelSelect) {
      channelSelect.selectedIndex = -1;
    }
  }
}

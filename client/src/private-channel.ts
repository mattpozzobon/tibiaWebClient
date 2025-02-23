import Channel from "./channel";
import GameClient from "./gameclient";

export default class PrivateChannel extends Channel {
  constructor(gameClient: GameClient, name: string) {
    super(gameClient, name, null);
  }

  __getEmptyMessage(): string {
    return `<div class="channel-empty">No messages in channel with ${this.name}.</div>`;
  }
}

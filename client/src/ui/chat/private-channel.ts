import Channel from "./channel";
import GameClient from "../../core/gameclient";

export default class PrivateChannel extends Channel {
  constructor(name: string) {
    super( name, null);
  }

  __getEmptyMessage(): string {
    return `<div class="channel-empty">No messages in channel with ${this.name}.</div>`;
  }
}

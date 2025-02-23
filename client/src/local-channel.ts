import Channel from "./channel";
import GameClient from "./gameclient";


export default class LocalChannel extends Channel {
  constructor(gameClient: GameClient, name: string) {
    super(gameClient, name, null);
  }
}

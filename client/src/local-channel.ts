import Channel from "./channel";
import GameClient from "./gameclient";


export default class LocalChannel extends Channel {
  constructor(name: string) {
    super( name, null);
  }
}

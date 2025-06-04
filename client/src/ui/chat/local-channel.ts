import Channel from "./channel";

export default class LocalChannel extends Channel {
  constructor(name: string) {
    super( name, null);
  }
}

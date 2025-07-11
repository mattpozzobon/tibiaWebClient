import GameClient from "../core/gameclient";
import Item from "./item";

export default class Book extends Item {
  private __content: string | null;

  constructor(id: number) {
    super( id, 1);
    this.__content = null;
  }

  public getContent(): string | null {
    return this.__content;
  }

  public setContent(content: string): void {
    this.__content = content;
  }
}

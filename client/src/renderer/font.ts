import { Assets } from "pixi.js";

export default class BMFontLoader {
  static async load(xmlUrl: string): Promise<void> {
    // Pixi will auto-load both the XML and the referenced PNG!
    await Assets.load(xmlUrl);
  }
  
}
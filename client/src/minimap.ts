import Canvas from "./canvas";
import GameClient from "./gameclient";
import Position from "./position";

export default class Minimap {
  gameClient: GameClient
  public minimap: Canvas;
  public nLayers: number;
  public __zoomLevel: number;
  public __renderLayer: number;
  public __imageBuffers: any[];
  public __currentIndex: any;
  public center: Position;
  public colors: number[];

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    // Create an off-screen canvas that holds the full minimap.
    this.minimap = new Canvas(gameClient, "minimap", 160, 160);
    // There are 16 minimap layers (8 above and 8 below ground).
    this.nLayers = 16;
    // Minimap state for the current zoom level and what layer is being rendered.
    this.__zoomLevel = 0;
    this.__renderLayer = 0;
    this.__imageBuffers = [];
    this.__currentIndex = null;
    // Current center of the minimap relative to the player character.
    this.center = new Position(0, 0, 0);
    this.addEventListeners();

    // Colors for the minimap (converted from hex string to number).
    this.colors = [
      "0xFF000000", "0xFF330000", "0xFF660000", "0xFF990000",
      "0xFFCC0000", "0xFFFF0000", "0xFF003300", "0xFF333300",
      "0xFF663300", "0xFF993300", "0xFFCC3300", "0xFFFF3300",
      "0xFF006600", "0xFF336600", "0xFF666600", "0xFF996600",
      "0xFFCC6600", "0xFFFF6600", "0xFF009900", "0xFF339900",
      "0xFF669900", "0xFF999900", "0xFFCC9900", "0xFFFF9900",
      "0xFF00CC00", "0xFF33CC00", "0xFF66CC00", "0xFF99CC00",
      "0xFFCCCC00", "0xFFFFCC00", "0xFF00FF00", "0xFF33FF00",
      "0xFF66FF00", "0xFF99FF00", "0xFFCCFF00", "0xFFFFFF00",
      "0xFF000033", "0xFF330033", "0xFF660033", "0xFF990033",
      "0xFFCC0033", "0xFFFF0033", "0xFF003333", "0xFF333333",
      "0xFF663333", "0xFF993333", "0xFFCC3333", "0xFFFF3333",
      "0xFF006633", "0xFF336633", "0xFF666633", "0xFF996633",
      "0xFFCC6633", "0xFFFF6633", "0xFF009933", "0xFF339933",
      "0xFF669933", "0xFF999933", "0xFFCC9933", "0xFFFF9933",
      "0xFF00CC33", "0xFF33CC33", "0xFF66CC33", "0xFF99CC33",
      "0xFFCCCC33", "0xFFFFCC33", "0xFF00FF33", "0xFF33FF33",
      "0xFF66FF33", "0xFF99FF33", "0xFFCCFF33", "0xFFFFFF33",
      "0xFF000066", "0xFF330066", "0xFF660066", "0xFF990066",
      "0xFFCC0066", "0xFFFF0066", "0xFF003366", "0xFF333366",
      "0xFF663366", "0xFF993366", "0xFFCC3366", "0xFFFF3366",
      "0xFF006666", "0xFF336666", "0xFF666666", "0xFF996666",
      "0xFFCC6666", "0xFFFF6666", "0xFF009966", "0xFF339966",
      "0xFF669966", "0xFF999966", "0xFFCC9966", "0xFFFF9966",
      "0xFF00CC66", "0xFF33CC66", "0xFF66CC66", "0xFF99CC66",
      "0xFFCCCC66", "0xFFFFCC66", "0xFF00FF66", "0xFF33FF66",
      "0xFF66FF66", "0xFF99FF66", "0xFFCCFF66", "0xFFFFFF66",
      "0xFF000099", "0xFF330099", "0xFF660099", "0xFF990099",
      "0xFFCC0099", "0xFFFF0099", "0xFF003399", "0xFF333399",
      "0xFF663399", "0xFF993399", "0xFFCC3399", "0xFFFF3399",
      "0xFF006699", "0xFF336699", "0xFF666699", "0xFF996699",
      "0xFFCC6699", "0xFFFF6699", "0xFF009999", "0xFF339999",
      "0xFF669999", "0xFF999999", "0xFFCC9999", "0xFFFF9999",
      "0xFF00CC99", "0xFF33CC99", "0xFF66CC99", "0xFF99CC99",
      "0xFFCCCC99", "0xFFFFCC99", "0xFF00FF99", "0xFF33FF99",
      "0xFF66FF99", "0xFF99FF99", "0xFFCCFF99", "0xFFFFFF99",
      "0xFF0000CC", "0xFF3300CC", "0xFF6600CC", "0xFF9900CC",
      "0xFFCC00CC", "0xFFFF00CC", "0xFF0033CC", "0xFF3333CC",
      "0xFF6633CC", "0xFF9933CC", "0xFFCC33CC", "0xFFFF33CC",
      "0xFF0066CC", "0xFF3366CC", "0xFF6666CC", "0xFF9966CC",
      "0xFFCC66CC", "0xFFFF66CC", "0xFF0099CC", "0xFF3399CC",
      "0xFF6699CC", "0xFF9999CC", "0xFFCC99CC", "0xFFFF99CC",
      "0xFF00CCCC", "0xFF33CCCC", "0xFF66CCCC", "0xFF99CCCC",
      "0xFFCCCCCC", "0xFFFFCCCC", "0xFF00FFCC", "0xFF33FFCC",
      "0xFF66FFCC", "0xFF99FFCC", "0xFFCCFFCC", "0xFFFFFFCC",
      "0xFF0000FF", "0xFF3300FF", "0xFF6600FF", "0xFF9900FF",
      "0xFFCC00FF", "0xFFFF00FF", "0xFF0033FF", "0xFF3333FF",
      "0xFF6633FF", "0xFF9933FF", "0xFFCC33FF", "0xFFFF33FF",
      "0xFF0066FF", "0xFF3366FF", "0xFF6666FF", "0xFF9966FF",
      "0xFFCC66FF", "0xFFFF66FF", "0xFF0099FF", "0xFF3399FF",
      "0xFF6699FF", "0xFF9999FF", "0xFFCC99FF", "0xFFFF99FF",
      "0xFF00CCFF", "0xFF33CCFF", "0xFF66CCFF", "0xFF99CCFF",
      "0xFFCCCCFF", "0xFFFFCCFF", "0xFF00FFFF", "0xFF33FFFF",
      "0xFF66FFFF", "0xFF99FFFF", "0xFFCCFFFF", "0xFFFFFFFF",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000",
      "0xFF000000", "0xFF000000", "0xFF000000", "0xFF000000"
    ].map(Number);
  }

  public openLargeMap(): void {
    this.gameClient.interface.modalManager.open("map-modal");
  }

  public cache(): void {
    const position =  this.gameClient.player!.getPosition();
    // Bounding rectangle for the minimap.
    const upperWest = new Position(position.x - 80, position.y - 80, this.__renderLayer);
    const upper = new Position(position.x, position.y - 80, this.__renderLayer);
    const upperEast = new Position(position.x + 80, position.y - 80, this.__renderLayer);
    const east = new Position(position.x + 80, position.y, this.__renderLayer);
    const lowerEast = new Position(position.x + 80, position.y + 80, this.__renderLayer);
    const lower = new Position(position.x, position.y + 80, this.__renderLayer);
    const lowerWest = new Position(position.x - 80, position.y + 80, this.__renderLayer);
    const west = new Position(position.x - 80, position.y, this.__renderLayer);

    // Preemptively load the chunks.
    this.gameClient.database.preloadCallback(
      [position, upperWest, upper, upperEast, east, lowerEast, lower, lowerWest, west],
      this.chunkUpdate.bind(this)
    );
  }

  public chunkUpdate(chunks: any): void {
    this.update(chunks);
    this.render(chunks);
  }

  public addEventListeners(): void {
    document.getElementById("minimap-current-layer")!.addEventListener("click", this.setCenter.bind(this));
    document.getElementById("minimap-zoom-up")!.addEventListener("click", this.changeZoomLevel.bind(this, 1));
    document.getElementById("minimap-zoom-down")!.addEventListener("click", this.changeZoomLevel.bind(this, -1));
    document.getElementById("minimap-zoom-el")!.addEventListener("click", this.changeLevel.bind(this, 1));
    document.getElementById("minimap-zoom-dl")!.addEventListener("click", this.changeLevel.bind(this, -1));
    this.minimap.canvas.addEventListener("wheel", this.scroll.bind(this));
    this.minimap.canvas.addEventListener("click", this.move.bind(this));
  }

  public setCenter(): void {
    this.center = new Position(0, 0, 0);
    this.setRenderLayer(this.gameClient.player!.getPosition().z);
  }

  public move(event: MouseEvent): void {
    this.center.x += (event.layerX - 80) / ((2 * this.__zoomLevel) + 1);
    this.center.y += (event.layerY - 80) / ((2 * this.__zoomLevel) + 1);
    this.cache();
  }

  public scroll(event: WheelEvent): void {
    if (event.deltaY < 0) {
      this.changeZoomLevel(1);
    } else {
      this.changeZoomLevel(-1);
    }
  }

  public setRenderLayer(layer: number): void {
    this.__renderLayer = Math.min(Math.max(0, layer), this.nLayers - 1);
    document.getElementById("minimap-current-layer")!.innerHTML = (this.__renderLayer - 8).toString();
    this.cache();
  }

  public changeLevel(level: number): void {
    this.__renderLayer += level;
    this.setRenderLayer(this.__renderLayer);
  }

  public update(chunks: any): void {
    this.gameClient.world.chunks.forEach((chunk: any) => {
      const tiles = chunk.getFloorTiles(this.gameClient.player!.getPosition().z);
      tiles.forEach((tile: any) => {
        if (tile === null) return;
        if (!this.gameClient.player!.canSee(tile)) return;
        const color = this.__getTileColor(tile);
        if (color === null) return;
        const buffer = chunks[ this.gameClient.database.getChunkIdentifier(tile.getPosition())];
        const index = (tile.getPosition().x % 128) + ((tile.getPosition().y % 128) * 128);
        buffer.view[index] = this.colors[color];
      });
    });
  }

  public __getTileColor(tile: any): any {
    const itemColors = tile.items.map((item: any) => item.getMinimapColor()).filter((x: any) => x !== null);
    if (itemColors.length > 0) {
      return itemColors[itemColors.length - 1];
    }
    return tile.getMinimapColor();
  }

  public changeZoomLevel(value: number): void {
    this.__zoomLevel += value;
    this.__zoomLevel = Math.min(Math.max(0, this.__zoomLevel), 4);
    this.cache();
  }

  public save(): void {
    this.gameClient.database.saveChunks();
  }

  public render(chunks: any): void {
    this.minimap.clear();
    Object.keys(chunks).forEach((id: string) => {
      const chunk = chunks[id];
      if (chunk === null) return;
      const [x, y, z] = id.split(".").map(Number);
      if (z !== this.__renderLayer) return;
      this.minimap.context.putImageData(
        chunk.imageData,
        x * 128 - this.gameClient.player!.getPosition().x + 80,
        y * 128 - this.gameClient.player!.getPosition().y + 80
      );
    }, this);
    this.minimap.context.globalCompositeOperation = "copy";
    for (let i = 0; i < this.__zoomLevel; i++) {
      this.minimap.context.drawImage(this.minimap.canvas, 0, 0, 160, 160, -80, -80, 320, 320);
    }
  }
}

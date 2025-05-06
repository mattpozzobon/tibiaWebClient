import Modal from "./modal";
import Canvas from "./canvas";
import Position from "./position";

export default class MapModal extends Modal {
  public canvas: Canvas;
  public span: HTMLElement;
  private __center: Position;
  private __mouseDownPosition: {x: number, y: number};
  private __boundMoveCallback: (event: MouseEvent) => void;
  private __zoomLevel: number;

  constructor(id: string) {
    super(id);
    
    this.canvas = new Canvas( "map-modal-canvas", 256, 256);
    const spanElem = document.querySelector(".map-modal-wrapper > span");
    if (!spanElem) {
      throw new Error("Span element not found.");
    }
    this.span = spanElem as HTMLElement;

    // Attach event listeners for scrolling and moving the map.
    this.canvas.canvas.addEventListener("mousedown", this.__attachMove.bind(this));
    this.canvas.canvas.addEventListener("wheel", this.__handleScroll.bind(this));
    document.addEventListener("mouseup", this.__removeMove.bind(this));

    // Use Position.NULL if available; otherwise, default to (0,0,0).
    this.__center = (Position as any).NULL || new Position(0, 0, 0);
    this.__mouseDownPosition = (Position as any).NULL || new Position(0, 0, 0);
    this.__boundMoveCallback = this.__handleMove.bind(this);
    this.__zoomLevel = 0;
  }

  private __removeMove(): void {
    this.canvas.canvas.removeEventListener("mousemove", this.__boundMoveCallback);
  }

  private __handleScroll(event: WheelEvent): void {
    if (event.deltaY < 0) {
      this.__changeZoomLevel(1);
    } else {
      this.__changeZoomLevel(-1);
    }
  }

  private __changeZoomLevel(value: number): void {
    this.__zoomLevel += value;
    this.__zoomLevel = Math.min(Math.max(0, this.__zoomLevel), 4);
    this.draw();
  }

  private __attachMove(event: MouseEvent): void {
    this.__mouseDownPosition = this.canvas.getCanvasCoordinates(event);
    this.canvas.canvas.addEventListener("mousemove", this.__boundMoveCallback);
  }

  private __handleMove(event: MouseEvent): void {
    const coords = this.canvas.getCanvasCoordinates(event);
    const x = coords.x;
    const y = coords.y;
    // Calculate difference from initial mouse down position.
    const deltaX = this.__mouseDownPosition.x - x;
    const deltaY = this.__mouseDownPosition.y - y;
    let moveOffset = new Position(deltaX, deltaY, 0);

    // Adjust for zoom level.
    moveOffset.x = Math.round(moveOffset.x * (1 / (this.__zoomLevel + 1)));
    moveOffset.y = Math.round(moveOffset.y * (1 / (this.__zoomLevel + 1)));

    // Update the center position.
    this.__center = this.__center.add(moveOffset);

    // Update the mouse down position to current coordinates.
    this.__mouseDownPosition = this.canvas.getCanvasCoordinates(event);

    this.draw();
  }

  public handleOpen = (): void => {
    // When the modal is opened, center it on the player's current position.
    this.__center = window.gameClient.player!.getPosition().copy();
    this.draw();
  }

  public draw(): void {
    // Update the span with the current center position.
    this.span.innerHTML = this.__center.toString();
    const position = this.__center;

    // Determine which chunks to load: a 5x5 grid around the player.
    const chunkPositions: Position[] = [];
    for (let x = -2; x <= 2; x++) {
      for (let y = -2; y <= 2; y++) {
        chunkPositions.push(new Position(position.x - x * 128, position.y - y * 128, position.z));
      }
    }

    this.canvas.clear();

    // Load visible chunks from the database.
    window.gameClient.database.preloadCallback(chunkPositions, (chunks: { [id: string]: any }) => {
      Object.entries(chunks).forEach(([id, chunk]) => {
        const [x, y, z] = id.split(".").map(Number);
        this.canvas.context.putImageData(
          chunk.imageData,
          x * 128 - position.x + 128,
          y * 128 - position.y + 128
        );
      });
    });

    // Set the composite operation for zooming.
    this.canvas.context.globalCompositeOperation = "copy";

    // Apply zooming effect by repeatedly drawing the canvas.
    for (let i = 0; i < this.__zoomLevel; i++) {
      this.canvas.context.drawImage(this.canvas.canvas, 0, 0, 256, 256, -128, -128, 512, 512);
    }

    // Optionally, retrieve the player's position (unused here) and drop old map chunks.
    const pos = window.gameClient.player!.getPosition();
    window.gameClient.database.dropWorldMapChunks(this.__center);
  }
}

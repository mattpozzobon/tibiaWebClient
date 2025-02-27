import Creature from "./creature";
import FrameGroup from "./frame-group";
import GameClient from "./gameclient";
import Interface from "./interface";
import Position from "./position";
import SpriteBuffer from "./sprite-buffer";

export default class Canvas {
  gameClient: GameClient
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;

  constructor(gameClient: GameClient, id: string | HTMLCanvasElement | null, width: number, height: number) {
    this.gameClient = gameClient;
    /*
     * Class Canvas
     * Container for writing to a HTML5 canvas
     * This is used for the main game screen and additional smaller canvases.
     */

    this.canvas = this.__reference(id);
    this.canvas.width = width;
    this.canvas.height = height;

    this.context = this.canvas.getContext("2d")!;
    this.context.imageSmoothingEnabled = false;
  }

  setScale(scale: number): void {
    /*
     * Updates the scale of the game screen canvas using CSS transforms.
     */
    this.canvas.style.transform = `scale(${scale})`;
  }

  renderText(text: string, x: number, y: number, color: string, font: string): void {
    /*
     * Renders text with a particular color on the canvas.
     */
    this.context.font = font;
    const width = 0.5 * this.context.measureText(text).width;

    // Outline text
    this.context.fillStyle = "black";
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        this.context.fillText(text, x + i - width, y + j);
      }
    }

    // Main text
    this.context.fillStyle = color;
    this.context.fillText(text, x - width, y);
  }

  getWorldCoordinates(event: MouseEvent): any {
    /*
     * Returns the clicked canvas coordinates in world coordinates.
     */
    const { x, y } = this.getCanvasCoordinates(event);
    const scaling = this.gameClient.interface.getSpriteScaling();
    const position = this.gameClient.player!.getPosition();

    const projectedViewPosition = new Position(
      Math.floor(x / scaling) + position.x - 7,
      Math.floor(y / scaling) + position.y - 5,
      position.z
    );

    const chunk = this.gameClient.world.getChunkFromWorldPosition(projectedViewPosition);

    return chunk ? chunk.getFirstTileFromTop(projectedViewPosition.projected()) : null;
  }

  getCanvasCoordinates(event: MouseEvent): { x: number; y: number } {
    /*
     * Returns the clicked canvas coordinates from 0,0 to canvas width & height in pixels.
     */
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  black(): void {
    /*
     * Fills the entire canvas with black.
     */
    this.context.fillStyle = "black";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  clear(): void {
    /*
     * Clears the canvas fully and transparently.
     */
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  applyFilter(filter: string): void {
    /*
     * Applies a post-processing filter to the rendered canvas.
     */
    this.__setFilter(filter);
    this.context.drawImage(this.canvas, 0, 0);
    this.__setFilter("none");
  }

  drawOuterCombatRect(position: Position, color: number): void {
    this.drawRect(32 * position.x + 0.5, 32 * position.y + 0.5, 30, color);
  }

  drawInnerCombatRect(animation: any, position: Position): void {
    this.drawRect(32 * position.x + 2.5, 32 * position.y + 2.5, 26, animation.color);
  }

  drawRect(x: number, y: number, size: number, color: number): void {
    this.context.beginPath();
    this.context.strokeStyle = Interface.prototype.getHexColor(color);
    this.context.lineWidth = 2;
    this.context.rect(x, y, size, size);
    this.context.stroke();
  }

  drawDistanceAnimation(animation: any, position: Position): void {
    /*
     * Draws a projectile animation to the canvas.
     */
    const fraction = animation.getFraction();
    const renderPosition = new Position(
      position.x + fraction * (animation.toPosition.x - animation.fromPosition.x),
      position.y + fraction * (animation.toPosition.y - animation.fromPosition.y),
      0
    );

    if (this.gameClient.interface.settings.isLightingEnabled() && animation.isLight()) {
      this.gameClient.renderer.__renderLightThing(renderPosition, animation, 1);
    }

    this.drawSprite(animation, renderPosition, 32);
  }

  drawSprite(thing: any, position: Position, size: number): void {
    const frameGroup = thing.getFrameGroup(FrameGroup.NONE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();

    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          this.__drawSprite(frameGroup.getSprite(index), position, x, y, size);
        }
      }
    }
  }

  __setFilter(filter: string): void {
    /*
     * Sets an SVG filter for the canvas.
     */
    switch (filter) {
      case "matrix":
        this.context.filter = "url(#matrix)";
        break;
      case "greyscale":
        this.context.filter = "grayscale()";
        break;
      case "hue":
        this.context.filter = `hue-rotate(${this.gameClient.getFrame() % 360}deg)`;
        break;
      case "invert":
        this.context.filter = "invert()";
        break;
      case "sepia":
        this.context.filter = "sepia()";
        break;
      case "blur":
        this.context.filter = "blur(4px)";
        break;
      case "saturate":
        this.context.filter = "saturate(20%)";
        break;
      case "none":
      default:
        this.context.filter = "none";
        break;
    }
  }

  private __drawSprite(sprite: any, position: Position, x: number, y: number, size: number): void {
    if (!sprite) return;

    this.gameClient.renderer.drawCalls++;

    this.context.drawImage(
      sprite.src,
      32 * sprite.position.x,
      32 * sprite.position.y,
      32, 32,
      Math.round(32 * (position.x - x)),
      Math.round(32 * (position.y - y)),
      32, 32
    );
  }

  private __reference(id: string | HTMLCanvasElement | null): HTMLCanvasElement {
    /*
     * References a new or existing canvas.
     */
    if (id === null) {
      return document.createElement("canvas");
    }
    if (typeof id === "string") {
      return document.getElementById(id) as HTMLCanvasElement;
    }
    return id;
  }

  drawSpriteOverlay(thing: any, position: Position, size: number): void {
    /*
     * Draws the blurred overlay over a draggable thing.
     */
    const frameGroup = thing.getFrameGroup(FrameGroup.GROUP_IDLE);
    const frame = thing.getFrame();
    const pattern = thing.getPattern();
  
    for (let x = 0; x < frameGroup.width; x++) {
      for (let y = 0; y < frameGroup.height; y++) {
        for (let l = 0; l < frameGroup.layers; l++) {
          let index = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, l, x, y);
          this.gameClient.renderer.outlineCanvas.createOutline(frameGroup.sprites[index]);
  
          this.context.drawImage(
            this.gameClient.renderer.outlineCanvas.canvas,
            0, 0, 33, 33,
            position.x * 32 - 1, position.y * 32 - 1,
            33, 33
          );
        }
      }
    }
  }
  
  drawCharacter(creature: Creature, position: Position, size: number, offset: number): void {
    /*
     * Draws a character (player/creature) onto the canvas.
     */
    let frames = creature.getCharacterFrames();

    console.log('creature', creature);
    console.log('frames', frames);
    if (frames === null) return;
  
    let xPattern = creature.__lookDirection % 4;
    let zPattern = frames.characterGroup.pattern.z > 1 && creature.isMounted() ? 1 : 0;
  
    this.__drawCharacter(
      creature.spriteBuffer,
      creature.spriteBufferMount,
      creature.outfit,
      position,
      frames.characterGroup,
      frames.mountGroup,
      frames.characterFrame,
      frames.mountFrame,
      frames.headGroup,
      frames.bodyGroup,
      frames.legsGroup,
      frames.feetGroup,
      frames.hairGroup,
      frames.leftHandGroup,
      frames.rightHandGroup,
      frames.headFrame,
      frames.bodyFrame,
      frames.legsFrame,
      frames.feetFrame,
      frames.hairFrame,
      frames.leftHandFrame,
      frames.rightHandFrame,
      xPattern,
      zPattern,
      size,
      offset,
      frames.isMoving
    );
  }
  
  __drawCharacter(
    spriteBuffer: any,
    spriteBufferMount: any,
    outfit: any,
    position: Position,
    characterGroup: any,
    mountGroup: any,
    characterFrame: number,
    mountFrame: number,
    headGroup: any,
    bodyGroup: any,
    legsGroup: any,
    feetGroup: any,
    hairGroup: any,
    leftHandGroup: any,
    rightHandGroup: any,
    headFrame: number,
    bodyFrame: number,
    legsFrame: number,
    feetFrame: number,
    hairFrame: number,
    leftHandFrame: number,
    rightHandFrame: number,
    xPattern: number,
    zPattern: number,
    size: number,
    offset: number,
    isMoving: boolean
  ): void {
    /*
     * Draws a character with all layers (armor, outfit, weapons, mount).
     */
    let drawPosition = new Position(position.x - offset, position.y - offset, 0);
  
    this.__drawCharacterLayer(spriteBuffer, outfit, characterGroup, characterFrame, xPattern, zPattern, drawPosition, size, 0);
    if (headGroup) this.__drawCharacterLayer(spriteBuffer, outfit, headGroup, headFrame, xPattern, zPattern, drawPosition, size, 0);
    if (bodyGroup) this.__drawCharacterLayer(spriteBuffer, outfit, bodyGroup, bodyFrame, xPattern, zPattern, drawPosition, size, 0);
    if (legsGroup) this.__drawCharacterLayer(spriteBuffer, outfit, legsGroup, legsFrame, xPattern, zPattern, drawPosition, size, 0);
    if (feetGroup) this.__drawCharacterLayer(spriteBuffer, outfit, feetGroup, feetFrame, xPattern, zPattern, drawPosition, size, 0);
    if (leftHandGroup) this.__drawCharacterLayer(spriteBuffer, outfit, leftHandGroup, leftHandFrame, xPattern, zPattern, drawPosition, size, 0);
    if (rightHandGroup) this.__drawCharacterLayer(spriteBuffer, outfit, rightHandGroup, rightHandFrame, xPattern, zPattern, drawPosition, size, 0);
  
    if (!headGroup && hairGroup) {
      const spriteBufferHair = new SpriteBuffer(64);
      this.__drawCharacterLayer(spriteBufferHair, outfit, hairGroup, hairFrame, xPattern, zPattern, drawPosition, size, 0, true);
    }
  
    if (zPattern === 1 && mountGroup) {
      let mountSprite = mountGroup.getSpriteId(mountFrame, xPattern, 0, 0, 0, 0, 0);
      if (mountSprite !== 0) {
        this.__drawSprite(spriteBufferMount.get(mountSprite), drawPosition, 0, 0, size);
      }
    }
  }
  
  private __drawCharacterLayer(
    spriteBuffer: any,
    outfit: any,
    group: any,
    frame: number,
    xPattern: number,
    zPattern: number,
    position: Position,
    size: number,
    yPattern: number,
    hasMask: boolean = false
  ): void {
    /*
     * Draws a character layer (armor, outfit, etc.).
     */
    if (!group) return;
  
    for (let x = 0; x < group.width; x++) {
      for (let y = 0; y < group.height; y++) {
        let spriteId = group.getSpriteId(frame, xPattern, yPattern, zPattern, 0, x, y);
        if (spriteId === 0) continue;
  
        if (hasMask) {
          if (!spriteBuffer.has(spriteId)) {
            spriteBuffer.addComposedOutfit(spriteId, outfit, group, frame, xPattern, zPattern, x, y);
          }
        }
  
        this.__drawSprite(spriteBuffer.get(spriteId), position, x, y, size);
      }
    }
  }  
}

import { Container, Sprite, BlurFilter } from "pixi.js";

export default class OutlineCanvasPixi extends Container {
  private __currentIdentifier: number = 0;
  private outlineSprite: Sprite | null = null;
  private glowSprite: Sprite | null = null;
  private readonly SPRITE_SIZE = 32;

  constructor() {
    super();
    this.visible = false;
  }

  /**
   * screenPosition: {x, y} in screen pixel coordinates (center of tile/item)
   */
  createOutline(spriteIdentifier: number, screenPosition: { x: number, y: number }): void {
    console.log("OutlineCanvasPixi.createOutline", { spriteIdentifier, screenPosition });
    if (spriteIdentifier === 0 || spriteIdentifier === this.__currentIdentifier) return;

    this.__currentIdentifier = spriteIdentifier;
    this.clear();

    const spriteTexture = window.gameClient.spriteBuffer.get(spriteIdentifier);
    if (!spriteTexture) return;

    // Glow sprite
    this.glowSprite = new Sprite(spriteTexture);
    this.glowSprite.width = this.SPRITE_SIZE;
    this.glowSprite.height = this.SPRITE_SIZE;
    this.glowSprite.anchor.set(0.5);
    this.glowSprite.tint = 0xFFFF00;
    this.glowSprite.scale.set(1.3);
    this.glowSprite.alpha = 0.6;
    this.glowSprite.filters = [new BlurFilter(4)];

    // Main sprite
    this.outlineSprite = new Sprite(spriteTexture);
    this.outlineSprite.width = this.SPRITE_SIZE;
    this.outlineSprite.height = this.SPRITE_SIZE;
    this.outlineSprite.anchor.set(0.5);

    this.addChild(this.glowSprite);
    this.addChild(this.outlineSprite);

    // Position outline at the center of the item
    this.position.set(screenPosition.x, screenPosition.y);

    this.visible = true;
  }

  clearOutline(): void {
    this.clear();
    this.visible = false;
  }

  clear(): void {
    this.removeChildren();
    if (this.outlineSprite) {
      this.outlineSprite.destroy();
      this.outlineSprite = null;
    }
    if (this.glowSprite) {
      this.glowSprite.destroy();
      this.glowSprite = null;
    }
    this.__currentIdentifier = 0;
  }
}

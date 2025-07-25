import Position from "../game/position";
import Thing from "../game/thing";
import FrameGroup from "./frame-group";


export default class Animation extends Thing {
  __created: number;
  static DEFAULT_FRAME_LENGTH_MS: number = 100;
  __durations: number[];
  private _cachedTotalDuration: number = -1;
  

  constructor(id: number) {
    super(id);
    
    this.__created = performance.now();
    this.__durations = this.__generateDurations();
    
  }

  getPattern(): Position {
    return Position.NULL;
  }

  getFrame(): number {
    let delta = this.__getAnimationAge();
    for (let i = 0; i < this.__durations.length; i++) {
      if (this.__durations[i] >= delta) {
        return i;
      }
    }
    return this.__durations.length - 1;
  }

  totalDuration(): number {
    if (this._cachedTotalDuration === -1) {
      this._cachedTotalDuration = this.__durations[this.__durations.length - 1];
    }
    return this._cachedTotalDuration;
  }

  expired(): boolean {
    return this.__getAnimationAge() >= this.totalDuration();
  }

  private __getAnimationAge(): number {
    return performance.now() - this.__created;
  }

  __generateDefaultDurations(): number[] {
    let duration = 0;
    let durations: number[] = [];
    let numberFrames = this.getFrameGroup(FrameGroup.NONE).animationLength;
    for (let i = 0; i < numberFrames; i++) {
      durations.push(duration += this.DEFAULT_FRAME_LENGTH_MS);
    }
    return durations;
  }

  generateExtendedDurations(): number[] {
    let durations = this.getFrameGroup(FrameGroup.NONE).animationLengths;
    let sum = 0;
    return durations.map(duration => sum += Math.floor(Math.random() * (duration.max - duration.min + 1)) + duration.min);
  }

  __generateDurations(): number[] {
    if (!window.gameClient.hasExtendedAnimations()) {
      return this.__generateDefaultDurations();
    }
    return this.generateExtendedDurations();
  }

  public getSprite(): any {
    /*
     * Function Animation.getSprite
     * Returns the current sprite for the animation based on the current frame
     */
    try {
      const frameGroup = this.getFrameGroup(FrameGroup.NONE);
      const frame = this.getFrame();
      const pattern = this.getPattern();
      
      // Get the sprite index for the current frame
      const spriteIndex = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, 0, 0);
      
      // Get the sprite texture
      const sprite = frameGroup.getSprite(spriteIndex);
      
      if (sprite) {
        return { texture: sprite };
      }
      
      return null;
    } catch (error) {
      console.error('Animation.getSprite: error', error);
      return null;
    }
  }

  public delete(): void {
    // Cleanup method for when animation expires
    // This is called by the renderer when removing expired animations
  }
}


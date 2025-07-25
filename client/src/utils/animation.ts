import Position from "../game/position";
import Thing from "../game/thing";
import FrameGroup from "./frame-group";


export default class Animation extends Thing {
  __created: number;
  static DEFAULT_FRAME_LENGTH_MS: number = 100;
  __durations: number[];
  

  constructor(id: number) {
    super(id);
    
    console.log('Animation constructor: created animation with id', id);
    
    this.__created = performance.now();
    this.__durations = this.__generateDurations();
    
    console.log('Animation constructor: durations', this.__durations);
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
    return this.__durations[this.__durations.length - 1];
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
    console.log('Animation.getSprite: called for animation id', this.id);
    
    try {
      const frameGroup = this.getFrameGroup(FrameGroup.NONE);
      console.log('Animation.getSprite: got frameGroup', frameGroup);
      
      const frame = this.getFrame();
      console.log('Animation.getSprite: current frame', frame);
      
      const pattern = this.getPattern();
      console.log('Animation.getSprite: pattern', pattern);
      
      // Get the sprite index for the current frame
      const spriteIndex = frameGroup.getSpriteIndex(frame, pattern.x, pattern.y, pattern.z, 0, 0, 0);
      console.log('Animation.getSprite: spriteIndex', spriteIndex);
      
      // Get the sprite texture
      const sprite = frameGroup.getSprite(spriteIndex);
      console.log('Animation.getSprite: sprite', sprite);
      
      if (sprite) {
        return { texture: sprite };
      }
      
      return null;
    } catch (error) {
      console.error('Animation.getSprite: error', error);
      return null;
    }
  }
}


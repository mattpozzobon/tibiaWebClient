import Position from "../game/position";
import Thing from "../game/thing";
import FrameGroup from "./frame-group";


export default class Animation extends Thing {
  __created: number;
  static DEFAULT_FRAME_LENGTH_MS: number = 100;
  __durations: number[];
  

  constructor(id: number) {
    super( id);
    
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
}


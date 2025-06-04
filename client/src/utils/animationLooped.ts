import Position from "../game/position";
import Thing from "../game/thing";


export default class LoopedAnimation extends Thing {
  static DRAWBLOOD: LoopedAnimation;
  static LOSEENERGY: LoopedAnimation;
  static POFF: LoopedAnimation;
  static BLOCKHIT: LoopedAnimation;
  static EXPLOSIONAREA: LoopedAnimation;
  static EXPLOSIONHIT: LoopedAnimation;
  static FIREAREA: LoopedAnimation;
  static YELLOW_RINGS: LoopedAnimation;
  static GREEN_RINGS: LoopedAnimation;
  static HITAREA: LoopedAnimation;
  static TELEPORT: LoopedAnimation;
  static ENERGYHIT: LoopedAnimation;
  static MAGIC_BLUE: LoopedAnimation;
  static MAGIC_RED: LoopedAnimation;
  static MAGIC_GREEN: LoopedAnimation;
  static HITBYFIRE: LoopedAnimation;
  static HITBYPOISON: LoopedAnimation;
  static MORTAREA: LoopedAnimation;
  static SOUND_GREEN: LoopedAnimation;
  static SOUND_RED: LoopedAnimation;
  static POISONAREA: LoopedAnimation;
  static SOUND_YELLOW: LoopedAnimation;
  static SOUND_PURPLE: LoopedAnimation;
  static SOUND_BLUE: LoopedAnimation;
  static SOUND_WHITE: LoopedAnimation;

  constructor(id: number) {
    super( id);
  }

  getPattern(): Position {
    return Position.NULL;
  }

  expired(): boolean {
    return false;
  }

  getFrame(): number {
    return this.__getGlobalFrame();
  }

  static initialize(): void {
    LoopedAnimation.DRAWBLOOD = new LoopedAnimation( this.getAnimationId( 1));
    LoopedAnimation.LOSEENERGY = new LoopedAnimation( this.getAnimationId( 2));
    LoopedAnimation.POFF = new LoopedAnimation( this.getAnimationId( 3));
    LoopedAnimation.BLOCKHIT = new LoopedAnimation( this.getAnimationId( 4));
    LoopedAnimation.EXPLOSIONAREA = new LoopedAnimation( this.getAnimationId( 5));
    LoopedAnimation.EXPLOSIONHIT = new LoopedAnimation( this.getAnimationId( 6));
    LoopedAnimation.FIREAREA = new LoopedAnimation( this.getAnimationId( 7));
    LoopedAnimation.YELLOW_RINGS = new LoopedAnimation( this.getAnimationId( 8));
    LoopedAnimation.GREEN_RINGS = new LoopedAnimation( this.getAnimationId( 9));
    LoopedAnimation.HITAREA = new LoopedAnimation( this.getAnimationId( 10));
    LoopedAnimation.TELEPORT = new LoopedAnimation( this.getAnimationId( 11));
    LoopedAnimation.ENERGYHIT = new LoopedAnimation( this.getAnimationId( 12));
    LoopedAnimation.MAGIC_BLUE = new LoopedAnimation( this.getAnimationId( 13));
    LoopedAnimation.MAGIC_RED = new LoopedAnimation( this.getAnimationId( 14));
    LoopedAnimation.MAGIC_GREEN = new LoopedAnimation( this.getAnimationId( 15));
    LoopedAnimation.HITBYFIRE = new LoopedAnimation( this.getAnimationId( 16));
    LoopedAnimation.HITBYPOISON = new LoopedAnimation( this.getAnimationId( 17));
    LoopedAnimation.MORTAREA = new LoopedAnimation( this.getAnimationId( 18));
    LoopedAnimation.SOUND_GREEN = new LoopedAnimation( this.getAnimationId( 19));
    LoopedAnimation.SOUND_RED = new LoopedAnimation( this.getAnimationId( 20));
    LoopedAnimation.POISONAREA = new LoopedAnimation( this.getAnimationId( 21));
    LoopedAnimation.SOUND_YELLOW = new LoopedAnimation( this.getAnimationId( 22));
    LoopedAnimation.SOUND_PURPLE = new LoopedAnimation( this.getAnimationId( 23));
    LoopedAnimation.SOUND_BLUE = new LoopedAnimation( this.getAnimationId( 24));
    LoopedAnimation.SOUND_WHITE = new LoopedAnimation( this.getAnimationId( 25));
  }

  private static getAnimationId(id: number): number {
    return window.gameClient.dataObjects.getAnimationId(id);
  }
}


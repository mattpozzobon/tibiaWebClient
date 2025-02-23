import GameClient from "./gameclient";
import Position from "./position";
import Thing from "./thing";


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

  constructor(gameClient: GameClient, id: number) {
    super(gameClient, id);
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

  static initialize(gameClient: GameClient): void {
    LoopedAnimation.DRAWBLOOD = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 1));
    LoopedAnimation.LOSEENERGY = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 2));
    LoopedAnimation.POFF = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 3));
    LoopedAnimation.BLOCKHIT = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 4));
    LoopedAnimation.EXPLOSIONAREA = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 5));
    LoopedAnimation.EXPLOSIONHIT = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 6));
    LoopedAnimation.FIREAREA = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 7));
    LoopedAnimation.YELLOW_RINGS = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 8));
    LoopedAnimation.GREEN_RINGS = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 9));
    LoopedAnimation.HITAREA = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 10));
    LoopedAnimation.TELEPORT = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 11));
    LoopedAnimation.ENERGYHIT = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 12));
    LoopedAnimation.MAGIC_BLUE = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 13));
    LoopedAnimation.MAGIC_RED = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 14));
    LoopedAnimation.MAGIC_GREEN = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 15));
    LoopedAnimation.HITBYFIRE = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 16));
    LoopedAnimation.HITBYPOISON = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 17));
    LoopedAnimation.MORTAREA = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 18));
    LoopedAnimation.SOUND_GREEN = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 19));
    LoopedAnimation.SOUND_RED = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 20));
    LoopedAnimation.POISONAREA = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 21));
    LoopedAnimation.SOUND_YELLOW = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 22));
    LoopedAnimation.SOUND_PURPLE = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 23));
    LoopedAnimation.SOUND_BLUE = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 24));
    LoopedAnimation.SOUND_WHITE = new LoopedAnimation(gameClient, this.getAnimationId(gameClient, 25));
  }

  private static getAnimationId(gameClient: GameClient, id: number): number {
    return gameClient.dataObjects.getAnimationId(id);
  }
}


import GameClient from "./gameclient";
import SkillWindow from "./window-skill";

export default class Skills {
  private __skills: { [key: string]: any };
  private gameClient: GameClient;

  constructor(gameClient: GameClient, skills: { [key: string]: any }) {
    this.gameClient = gameClient;
    this.__skills = skills;
    Object.entries(this.__skills).forEach(([key, value]) => {
      (this.gameClient.interface.windowManager.getWindow("skill-window") as SkillWindow).setSkillValue(key, value, Math.random() * 100);
    });
  }
}

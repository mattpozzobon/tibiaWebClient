import GameClient from "./gameclient";
import SkillWindow from "./window-skill";

export default class Skills {
  private __skills: { [key: string]: any };
 

  constructor(skills: { [key: string]: any }) {
    
    this.__skills = skills;
    Object.entries(this.__skills).forEach(([key, value]) => {
      (window.gameClient.interface.windowManager.getWindow("skill-window") as SkillWindow).setSkillValue(key, value, Math.random() * 100);
    });
  }
}

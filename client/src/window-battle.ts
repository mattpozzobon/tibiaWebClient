import Canvas from "./canvas";
import GameClient from "./gameclient";
import { TargetPacket } from "./protocol";
import InteractiveWindow from "./window";

export default class BattleWindow extends InteractiveWindow {
  gameClient: GameClient

  constructor(gameClient: GameClient, element: HTMLElement) {
    super(element);
    this.gameClient = gameClient; 
  }

  public removeCreature(id: number | string): void {
    // Replace "[id="%s"]".format(id) with a template string.
    const elem = this.getBody().querySelector(`[id="${id}"]`);
    if (elem === null) {
      return;
    }
    elem.remove();
  }

  public setTarget(creature: any): void {
    // Iterate over all children in the body.
    Array.from(this.getBody().children).forEach(x => {
      const element = x as HTMLElement;
      if (creature === null) {
        element.style.border = "1px solid black";
        return;
      }
      if (Number(element.getAttribute("id")) === creature.id) {
        element.style.border = "1px solid red";
      } else {
        element.style.border = "1px solid black";
      }
    });
  }

  public addCreature(creature: any): void {
    // Get the target node template and clone it.
    const targetTemplate = document.getElementById("battle-window-target");
    if (!targetTemplate) return;
    const node = targetTemplate.cloneNode(true) as HTMLElement;
    node.style.display = "flex";
    node.setAttribute("id", creature.id.toString());
  
    // Create a new Canvas for the creature.
    const canvasParent = node.lastElementChild?.firstElementChild as HTMLCanvasElement;
    if (!canvasParent) return;
    const canvas = new Canvas(this.gameClient, canvasParent, 64, 64);
  
    const frames = creature.getCharacterFrames();
    const zPattern = (frames.characterGroup.pattern.z > 1 && creature.isMounted()) ? 1 : 0;
  
    // TODO: Draw the character on the canvas.
    // canvas.__drawCharacter(
    //   creature.spriteBuffer,
    //   creature.spriteBufferMount,
    //   creature.outfit,
    //   new Position(1, 1, 0),
    //   frames.characterGroup,
    //   frames.mountGroup,
    //   frames.characterFrame,
    //   frames.mountFrame,
    //   CONST.DIRECTION.SOUTH,
    //   zPattern,
    //   32,
    //   0
    // );
  
    // Update health and mana bars.
    const nodeList = node.querySelectorAll(".battle-window-bar-wrapper");
    if (nodeList.length >= 2) {
      nodeList[0].firstElementChild!.innerHTML = `${creature.state.health}|${creature.maxHealth}`;
      nodeList[1].lastElementChild!.innerHTML = `${creature.state.mana || 0}|${creature.maxMana || 0}`;
    }
    // Set the creature name.
    const nameSpan = node.firstElementChild?.firstElementChild as HTMLElement;
    nameSpan.innerHTML = creature.name;
  
    // Append the node to the window body.
    this.getBody().appendChild(node);
  
    // Add a click listener to select the creature.
    node.addEventListener("click", () => {
      // Use node.id (converted to number) as the creature identifier.
      const targetCreature = this.gameClient.world.getCreature(Number(node.id));
      this.gameClient.player!.setTarget(targetCreature);
      this.gameClient.send(new TargetPacket(Number(node.id)));
    });
  }
  
}

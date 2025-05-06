import Canvas from "./canvas";
import { TargetPacket } from "./protocol";
import InteractiveWindow from "./window";

export default class BattleWindow extends InteractiveWindow {
  constructor(element: HTMLElement) {
    super(element);
     
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
    const canvas = new Canvas(canvasParent, 64, 64);
  
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
      nodeList[0].firstElementChild!.innerHTML = `${creature.vitals.health}|${creature.vitals.maxHealth}`;
      nodeList[1].lastElementChild!.innerHTML = `${creature.vitals.mana || 0}|${creature.vitals.maxMana || 0}`;
    }
    // Set the creature name.
    const nameSpan = node.firstElementChild?.firstElementChild as HTMLElement;
    nameSpan.innerHTML = creature.name;
  
    // Append the node to the window body.
    this.getBody().appendChild(node);
  
    // Add a click listener to select the creature.
    node.addEventListener("click", () => {
      // Use node.id (converted to number) as the creature identifier.
      const targetCreature = window.gameClient.world.getCreature(Number(node.id));
      window.gameClient.player!.setTarget(targetCreature);
      window.gameClient.send(new TargetPacket(Number(node.id)));
    });
  }
  
}

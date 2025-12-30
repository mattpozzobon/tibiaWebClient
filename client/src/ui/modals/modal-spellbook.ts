import Canvas from "../../renderer/canvas";
import HotbarManager from "../managers/hotbar-manager";
import Modal from "./modal";


interface Spell {
  name: string;
  description: string;
  icon: { x: number; y: number };
}

export default class SpellbookModal extends Modal {
  ;
  private __wrapper: HTMLElement;
  private __index: number;

  constructor(id: string) {
    super(id);

    
    const wrapper = document.getElementById("spellbook-list");
    if (!wrapper) {
      throw new Error("Element with id 'spellbook-list' not found.");
    }
    this.__wrapper = wrapper;
    this.__index = 0;
  }

  // Using an arrow function property to avoid issues with 'this'
  private __handleClick = (sid: number ): void => {
    //window.gameClient.interface.hotbarManager.addSlot(this.__index, sid);
    const cancelButton = this.element.querySelector("button[action='cancel']");
    if (cancelButton) {
      // __buttonClick is assumed to be defined on the base class (Modal)
      const fakeEvent = new MouseEvent("click");
        Object.defineProperty(fakeEvent, "target", { value: cancelButton, writable: false });
        this.__buttonClick(fakeEvent);
    }
  };

  public createSpellList(spells: (number)[]): void {
    const nodes = Array.from(spells).map(this.__createSpellNode, this);
    const listElem = document.getElementById("spellbook-list");
    if (listElem) {
      listElem.replaceChildren(...nodes);
    }
  }

  private __createSpellNode = (id: number): HTMLElement => {
    const spell: Spell = window.gameClient.interface.getSpell(id);
    const prototypeElem = document.getElementById("spellbook-wrapper-prototype");
    if (!prototypeElem) {
      throw new Error("Element with id 'spellbook-wrapper-prototype' not found.");
    }
    // Clone the prototype element.
    const DOMElement = prototypeElem.cloneNode(true) as HTMLElement;
    const DOMElementCanvas = DOMElement.firstElementChild as HTMLElement;
    const canvas = new Canvas(DOMElementCanvas as HTMLCanvasElement, 32, 32);

    // Draw the spell icon on the canvas.
    canvas.context.drawImage(
      HotbarManager.prototype.ICONS,
      32 * spell.icon.x,
      32 * spell.icon.y,
      32,
      32,
      0,
      0,
      32,
      32
    );

    // Set spell name and description.
    const lastChild = DOMElement.lastElementChild as HTMLElement;
    lastChild.innerHTML = `${spell.name}<br><small>${spell.description}</small>`;
    DOMElement.addEventListener("click", this.__handleClick.bind(this, id));
    DOMElement.title = spell.description;
    DOMElement.style.display = "flex";

    return DOMElement;
  };

  public handleOpen = (index: number): void => {
    this.__index = index;
  }
}

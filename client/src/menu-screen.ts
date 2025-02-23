import GameClient from "./gameclient";
import Menu from "./menu";


export default class ScreenMenu extends Menu {
  gameClient: GameClient;

  constructor(gameClient: GameClient, id: string) {
    super(id);
    this.gameClient = gameClient;
  }

  /**
   * Callback fired specially for the ScreenMenu after a button is clicked.
   */
  public click = (event: Event): void => {
    // Get the selected world object from the stored downEvent (assumed to be a MouseEvent)
    const object = this.gameClient.mouse.getWorldObject(this.downEvent as MouseEvent);
    const action = this.__getAction(event);
    switch (action) {
      case "look":
        this.gameClient.mouse.look(object);
        break;
      case "use":
        this.gameClient.mouse.use(object);
        break;
      case "outfits":
        this.gameClient.interface.modalManager.open("outfit-modal", event);
        break;
    }
    this.close(); // Explicitly close the menu.
  };
  

  /**
   * Dynamically adds a new button to the menu if it doesn't already exist.
   * @param action - The action identifier for the button.
   * @param label - The text displayed on the button.
   */
  public addOption(action: string, label: string): void {
    if (this.element.querySelector(`button[action="${action}"]`)) {
      return; // Do not add the button if it already exists.
    }
    const button = document.createElement("button");
    button.setAttribute("action", action);
    button.textContent = label;
    button.classList.add("dynamic-option");
    button.addEventListener("click", (event: MouseEvent) => this.click(event));
    this.element.appendChild(button);
  }

  /**
   * Removes all dynamically added buttons from the menu.
   */
  public removeDynamicOptions(): void {
    const dynamicButtons = this.element.querySelectorAll(".dynamic-option");
    dynamicButtons.forEach(button => button.remove());
  }
}

import Modal from "./modal";

export class CharacterSelectorModal extends Modal {
  private characters: any[] = [];
  private token: string = "";
  private gameHost: string = "";

  constructor(id: string) {
    super(id);
  }

  public open(characters: any[], token: string, loginHost: string, gameHost: string): void {
    this.characters = characters;
    this.token = token;
    this.gameHost = gameHost;
    this.render();
    super.handleOpen();
  }

  private render(): void {
    const list = document.getElementById("character-list");
    if (!list) return;

    list.innerHTML = "";
    for (const char of this.characters) {
      const item = document.createElement("button");
      item.textContent = char.name;
      item.onclick = () => this.selectCharacter(char.id);
      list.appendChild(item);
    }
  }

  private selectCharacter(characterId: number): void {
    window.gameClient.interface.modalManager.close();
    window.gameClient.networkManager.connectGameServer(this.gameHost, this.token, characterId);
  }
}

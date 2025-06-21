import Modal from "./modal";

export class CharacterSelectorModal extends Modal {
  private characters: any[] = [];
  private token = "";
  private gameHost = "";
  private selectedCharacterId: number | null = null;

  constructor(id: string) {
    super(id);
  }

  public open(characters: any[], token: string, loginHost: string, gameHost: string): void {
    this.characters = characters;
    this.token = token;
    this.gameHost = gameHost;
    this.selectedCharacterId = null;

    this.render();
    super.handleOpen();

    const goButton = document.getElementById("enter-game-button");
    if (goButton) {
      goButton.onclick = () => this.enterGame();
    }
  }

  private render(): void {
    const list = document.getElementById("character-list");
    if (!list) return;

    list.innerHTML = "";

    for (const char of this.characters) {
      const card = document.createElement("div");
      card.className = "character-card";
      card.textContent = char.name;

      card.onclick = () => {
        this.selectedCharacterId = char.id;
        this.updateSelection(card);
      };

      list.appendChild(card);
    }
  }

  private updateSelection(selectedCard: HTMLElement): void {
    const allCards = document.querySelectorAll(".character-card");
    allCards.forEach(card => card.classList.remove("selected"));
    selectedCard.classList.add("selected");
  }

  private enterGame(): void {
    if (this.selectedCharacterId === null) {
      alert("Please select a character first.");
      return;
    }

    window.gameClient.interface.modalManager.close();
    window.gameClient.networkManager.connectGameServer(this.gameHost, this.token, this.selectedCharacterId);
  }
}

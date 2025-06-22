import Modal from "./modal";

export default class CharacterSelectorModal extends Modal {
  private characters: any[] = [];
  private token = "";
  private gameHost = "";
  private loginHost = "";
  private selectedCharacterId: number | null = null;

  constructor(id: string) {
    super(id);
  }

  public open(characters: any[], token: string, loginHost: string, gameHost: string): void {
    this.characters = characters;
    this.token = token;
    this.loginHost = loginHost;
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

    const maxSlots = 5;
    const charactersToRender = this.characters.slice(0, maxSlots);

    // Render existing characters
    charactersToRender.forEach((char) => {
      const card = document.createElement("div");
      card.className = "character-card";
      card.textContent = char.name;

      card.onclick = () => {
        this.selectedCharacterId = char.id;
        this.updateSelection(card);
      };

      list.appendChild(card);
    });

    // Fill remaining slots with "New Character"
    const remaining = maxSlots - charactersToRender.length;
    for (let i = 0; i < remaining; i++) {
      const card = document.createElement("div");
      card.className = "character-card flip-container";

      const flipper = document.createElement("div");
      flipper.className = "flipper";

      // Front side with SVG
      const front = document.createElement("div");
      front.className = "front";
      front.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" style="cursor: pointer;">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      front.onclick = () => {
        flipper.classList.add("flipped");
      };

      // Back side with form
      const back = document.createElement("div");
      back.className = "back";
      back.innerHTML = `
        <input type="text" id="char-name" placeholder="Name" />
        <select id="char-sex">
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <button class="btn-border btn-green">Create</button>
      `;
      back.querySelector("button")!.onclick = this.handleCreate;

      flipper.appendChild(front);
      flipper.appendChild(back);
      card.appendChild(flipper);
      list.appendChild(card);
    }
  }

  private updateSelection(selectedCard: HTMLElement): void {
    const allCards = document.querySelectorAll(".character-card");
    allCards.forEach((card) => card.classList.remove("selected"));
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

  public override handleCancel(): boolean {
    return false;
  }

  public override handleConfirm(): boolean {
    if (this.selectedCharacterId === null) {
      alert("Select a character before proceeding.");
      return false;
    }
    this.enterGame();
    return true;
  }

  public override shouldStayOpenOnReopen(): boolean {
    return true;
  }

  public handleCreate = (): void => {
    const nameInput = document.getElementById("char-name") as HTMLInputElement;
    const sexInput = document.getElementById("char-sex") as HTMLSelectElement;

    const name = nameInput?.value.trim();
    const sex = sexInput?.value as "male" | "female";

    if (!name || !sex) return;

    fetch(`http://${this.loginHost}/characters/create?token=${this.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sex }),
    })
      .then((res) => res.json())
      .then((data) => {
        window.gameClient.interface.modalManager.close();
        window.gameClient.networkManager.connectGameServer(this.gameHost, this.token, data.characterId);
      })
      .catch((err) => {
        alert("Failed to create character: " + err.message);
      });
  };
}

import Modal from "./modal";

export default class CharacterCreatorModal extends Modal {
  private token: string = "";
  private loginHost: string = "";
  private gameHost: string = "";

  constructor(id: string) {
    super(id);
    document.getElementById("create-char-btn")?.addEventListener("click", this.handleCreate);
  }

  public open(token: string, loginHost: string, gameHost: string): void {
    this.token = token;
    this.loginHost = loginHost;
    this.gameHost = gameHost;
    super.handleOpen();
  }

  public handleCreate = (): void => {
    const nameInput = document.getElementById("char-name") as HTMLInputElement;
    const sexInput = document.getElementById("char-sex") as HTMLSelectElement;

    const name = nameInput.value.trim();
    const sex = sexInput.value as "male" | "female";

    if (!name || !sex) return;

    fetch(`http://${this.loginHost}/characters/create?token=${this.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sex }),
    })
      .then(res => res.json())
      .then(data => {
        window.gameClient.interface.modalManager.close();
        window.gameClient.networkManager.connectGameServer(this.gameHost, this.token, data.characterId);
      })
      .catch(err => {
        alert("Failed to create character: " + err.message);
      });
  };
}

import CharacterSelectorModal from "../modals/modal-character-select";

export default class LoginFlowManager {
  private token = "";
  private characters: any[] = [];
  private loginHost = "";
  private gameHost = "";

  private readonly preLoginWrapper = document.getElementById("pre-login-wrapper")!;
  private readonly postLoginWrapper = document.getElementById("post-login-wrapper")!;
  private readonly gameWrapper = document.getElementById("game-wrapper")!;
  private readonly changelog = document.getElementById("changelog-container");
  private readonly loginWrapper = document.getElementById("login-wrapper");

  private readonly playBtn = document.getElementById("topbar-play-btn");
  private readonly newsBtn = document.getElementById("topbar-news-btn");

  public setLoginInfo(token: string, characters: any[], loginHost: string, gameHost: string): void {
    this.token = token;
    this.characters = characters;
    this.loginHost = loginHost;
    this.gameHost = gameHost;
  }

  public showPreLogin(): void {
    this.setDisplay("flex", "none", "none");
    this.loginWrapper?.classList.remove("post-login");
    this.setActiveButton(null);
  }

  public showPostLogin(): void {
    this.setDisplay("none", "block", "none");
    if (this.changelog) this.changelog.style.display = "none";
    this.loginWrapper?.classList.add("post-login");
    this.setActiveButton("play");

    const modal = window.gameClient.interface.modalManager.open("character-selector") as CharacterSelectorModal;
    modal?.open(this.characters, this.token, this.loginHost, this.gameHost);
  }

  public showChangelog(): void {
    this.setDisplay("none", "block", "none");
    if (this.changelog) this.changelog.style.display = "flex";
    this.loginWrapper?.classList.add("post-login");
    this.setActiveButton("news");
    window.gameClient.interface.modalManager.close();
  }

  public showGame(): void {
    this.setDisplay("none", "none", "flex");
    this.setActiveButton(null);
  }

  public reset(): void {
    this.showPreLogin();
  }

  private setDisplay(pre: string, post: string, game: string): void {
    this.preLoginWrapper.style.display = pre;
    this.postLoginWrapper.style.display = post;
    this.gameWrapper.style.display = game;
  }

  private setActiveButton(active: "play" | "news" | null): void {
    if (this.playBtn) {
      this.playBtn.classList.toggle("active", active === "play");
    }
    if (this.newsBtn) {
      this.newsBtn.classList.toggle("active", active === "news");
    }
  }
}

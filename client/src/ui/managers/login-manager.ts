import CharacterSelectorModal from "../modals/modal-character-select";

interface LoginInfo {
  token: string;
  characters: any[];
  loginHost: string;
  gameHost: string;
}

interface UIElements {
  preLoginWrapper: HTMLElement;
  postLoginWrapper: HTMLElement;
  gameWrapper: HTMLElement;
  changelog: HTMLElement | null;
  loginWrapper: HTMLElement | null;
  playBtn: HTMLButtonElement | null;
  newsBtn: HTMLButtonElement | null;
}

type ActiveButton = "play" | "news" | null;

export default class LoginFlowManager {
  private loginInfo: LoginInfo = {
    token: "",
    characters: [],
    loginHost: "",
    gameHost: ""
  };

  private readonly ui: UIElements;

  constructor() {
    this.ui = {
      preLoginWrapper: this.getElementOrThrow("pre-login-wrapper"),
      postLoginWrapper: this.getElementOrThrow("post-login-wrapper"),
      gameWrapper: this.getElementOrThrow("game-wrapper"),
      changelog: document.getElementById("changelog-container"),
      loginWrapper: document.getElementById("login-wrapper"),
      playBtn: document.getElementById("topbar-play-btn") as HTMLButtonElement,
      newsBtn: document.getElementById("topbar-news-btn") as HTMLButtonElement
    };
  }

  private getElementOrThrow(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Required element with id '${id}' not found`);
    }
    return element;
  }

  public setLoginInfo(token: string, characters: any[], loginHost: string, gameHost: string): void {
    this.loginInfo = { token, characters, loginHost, gameHost };
  }

  public showPreLogin(): void {
    this.setDisplay("flex", "none", "none");
    this.ui.loginWrapper?.classList.remove("post-login");
    this.showChangelogElement();
    this.setActiveButton(null);
  }

  public async showPostLogin(): Promise<void> {
    this.setDisplay("none", "block", "none");
    this.ui.loginWrapper?.classList.add("post-login");

    try {
      const assetsAreUpToDate = await window.gameClient.database.areAssetsUpToDate();

      if (assetsAreUpToDate) {
        this.enableCharacterSelection();
        return;
      }

      this.prepareForAssetDownload();
      await this.downloadAssets();
    } catch (error) {
      console.error("Asset check/download failed:", error);
      this.handleAssetDownloadError();
    }
  }

  public showChangelog(): void {
    this.setDisplay("none", "block", "none");
    this.showChangelogElement();
    this.ui.loginWrapper?.classList.add("post-login");
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
    this.ui.preLoginWrapper.style.display = pre;
    this.ui.postLoginWrapper.style.display = post;
    this.ui.gameWrapper.style.display = game;
  }

  private setActiveButton(active: ActiveButton): void {
    if (this.ui.playBtn) {
      this.ui.playBtn.classList.toggle("active", active === "play");
    }
    if (this.ui.newsBtn) {
      this.ui.newsBtn.classList.toggle("active", active === "news");
    }
  }

  private showChangelogElement(): void {
    if (this.ui.changelog) {
      this.ui.changelog.style.display = "flex";
    }
  }

  private hideChangelogElement(): void {
    if (this.ui.changelog) {
      this.ui.changelog.style.display = "none";
    }
  }

  private prepareForAssetDownload(): void {
    this.setActiveButton("news");
    this.showChangelogElement();
    this.disablePlayButton("Downloading required assets...");
    this.enableNewsButton();
  }

  private async downloadAssets(): Promise<void> {
    await window.gameClient.networkManager.downloadManager.loadGameAssetsWithUI(() => {
      this.enableCharacterSelection();
    });
  }

  private handleAssetDownloadError(): void {
    this.enablePlayButton();
    this.enableNewsButton();
    this.setActiveButton("news");
    this.showChangelogElement();
  }

  private disablePlayButton(title?: string): void {
    if (this.ui.playBtn) {
      this.ui.playBtn.disabled = true;
      if (title) {
        this.ui.playBtn.title = title;
      }
    }
  }

  private enablePlayButton(): void {
    if (this.ui.playBtn) {
      this.ui.playBtn.disabled = false;
      this.ui.playBtn.removeAttribute("title");
    }
  }

  private enableNewsButton(): void {
    if (this.ui.newsBtn) {
      this.ui.newsBtn.disabled = false;
    }
  }

  private enableCharacterSelection(): void {
    this.enablePlayButton();
    this.hideChangelogElement();
    this.setActiveButton("play");

    const modal = window.gameClient.interface.modalManager.open("character-selector") as CharacterSelectorModal;
    modal?.open(
      this.loginInfo.characters, 
      this.loginInfo.token, 
      this.loginInfo.loginHost, 
      this.loginInfo.gameHost
    );
  }
}

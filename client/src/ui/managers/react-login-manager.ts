// Character selection now handled by React components

interface LoginInfo {
  token: string;
  characters: any[];
  loginHost: string;
  gameHost: string;
}

interface UIElements {
  preLoginWrapper: HTMLElement | null;
  postLoginWrapper: HTMLElement | null;
  gameWrapper: HTMLElement | null;
  changelog: HTMLElement | null;
  loginWrapper: HTMLElement | null;
  playBtn: HTMLButtonElement | null;
  newsBtn: HTMLButtonElement | null;
}

type ActiveButton = "play" | "news" | null;

export default class ReactLoginFlowManager {
  private loginInfo: LoginInfo = {
    token: "",
    characters: [],
    loginHost: "",
    gameHost: ""
  };

  private readonly ui: UIElements;

  constructor() {
    this.ui = {
      preLoginWrapper: document.getElementById("pre-login-wrapper"),
      postLoginWrapper: document.getElementById("post-login-wrapper"),
      gameWrapper: document.getElementById("game-wrapper"),
      changelog: document.getElementById("changelog-container"),
      loginWrapper: document.getElementById("login-wrapper"),
      playBtn: document.getElementById("topbar-play-btn") as HTMLButtonElement,
      newsBtn: document.getElementById("topbar-news-btn") as HTMLButtonElement
    };
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

      // Asset download now handled by React components
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
    //window.gameClient.interface.modalManager.close();
  }

  public showGame(): void {
    this.setDisplay("none", "none", "flex");
    this.setActiveButton(null);
  }

  public reset(): void {
    this.showPreLogin();
  }

  private setDisplay(pre: string, post: string, game: string): void {
    if (this.ui.preLoginWrapper) this.ui.preLoginWrapper.style.display = pre;
    if (this.ui.postLoginWrapper) this.ui.postLoginWrapper.style.display = post;
    if (this.ui.gameWrapper) this.ui.gameWrapper.style.display = game;
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

  // Asset download methods removed - now handled by React components

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

  public enableCharacterSelection(): void {
    // Character selection now handled by React components - this method is kept for compatibility
    console.log('Character selection handled by React components');
  }
}

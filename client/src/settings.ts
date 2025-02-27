import GameClient from "./gameclient";
import GameInterface from "./interface";

interface SettingsState {
  "enable-sound": boolean;
  "enable-lighting": boolean;
  "enable-weather": boolean;
  [key: string]: any;
}

export default class Settings {
  gameInterface: GameInterface;
  gameClient: GameClient;
  private __state!: SettingsState;

  constructor(gameClient: GameClient, gameInterface: GameInterface) {
    this.gameInterface = gameInterface;
    this.gameClient = gameClient;
  

    // Set the volume slider callback function.
    const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement | null;
    if (volumeSlider) {
      volumeSlider.oninput = this.setVolume;
    }

    // Set the initial volume slider value.
    const volumeSliderValue = document.getElementById("volume-slider-value");
    if (volumeSlider && volumeSliderValue) {
      volumeSliderValue.innerHTML = `${volumeSlider.value}%`;
    }

    // Attach event listeners for resolution changes.
    const enableResolution = document.getElementById("enable-resolution");
    const resolution = document.getElementById("resolution");
    // Assuming Interface.prototype.handleResize exists and is typed properly.
    if (enableResolution) {
      // Bind to the parent's handleResize method.
      enableResolution.addEventListener("change", this.gameInterface.handleResize.bind(this.gameInterface));
    }
    if (resolution) {
      resolution.addEventListener("change", this.gameInterface.handleResize.bind(this.gameInterface));
    }

    // Add event listener for anti-aliasing.
    const antiAliasing = document.getElementById("anti-aliasing");
    if (antiAliasing) {
      antiAliasing.addEventListener("change", this.__setAA);
    }

    this.__init();

    // Apply state to the DOM to keep it in sync.
    Object.keys(this.__state).forEach(this.__applyState.bind(this));
  }

  /**
   * __setAA event handler.
   * Sets the canvas image rendering based on the anti-aliasing checkbox state.
   */
  __setAA(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      window.gameClient.renderer.screen.canvas.style.imageRendering = "auto";
    } else {
      window.gameClient.renderer.screen.canvas.style.imageRendering = "pixelated";
    }
  }

  /**
   * setVolume event handler.
   * Sets the master volume of the application.
   */
  setVolume(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volume = Number(target.value);
    this.gameClient.interface.soundManager.setMasterVolume(volume / 100);
    const volumeSliderValue = document.getElementById("volume-slider-value");
    if (volumeSliderValue) {
      volumeSliderValue.innerHTML = `${volume}%`;
    }
  }

  /**
   * Clears settings from local storage.
   */
  clear(): void {
    localStorage.removeItem("settings");
  }

  /**
   * Returns true if sound is enabled.
   */
  isSoundEnabled(): boolean {
    return this.__state["enable-sound"];
  }

  /**
   * Returns true if weather is enabled.
   */
  isWeatherEnabled(): boolean {
    return this.__state["enable-weather"];
  }

  /**
   * Returns true if lighting is enabled.
   */
  isLightingEnabled(): boolean {
    return this.__state["enable-lighting"];
  }

  /**
   * Saves the current settings state to local storage.
   */
  saveState(): void {
    localStorage.setItem("settings", JSON.stringify(this.__state));
  }

  /**
   * Toggles a setting based on the event target and saves the new state.
   */
  __toggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    switch (target.id) {
      case "enable-lighting":
      case "enable-weather":
      case "enable-sound":
        this.__state[target.id] = target.checked;
        this.gameClient.interface.soundManager.enableSound(target.checked);
        break;
      case "toggle-scale-gamewindow":
        this.__state[target.id] = target.checked;
        this.__toggleScaleGamewindow(target.checked);
        break;
      default:
        return;
    }
    this.saveState();
  }

  /**
   * Stub for toggling the game window scale.
   */
  __toggleScaleGamewindow(checked: boolean): void {
    // Implement toggle behavior for scaling the game window.
  }

  /**
   * Initializes the settings state from local storage.
   */
  __init(): void {
    const state = localStorage.getItem("settings");
    if (state === null) {
      this.__state = this.__getCleanState();
    } else {
      this.__state = JSON.parse(state);
      this.__update();
    }
  }

  /**
   * Updates the settings state with any new or removed settings.
   */
  __update(): void {
    const cleanState = this.__getCleanState();
    // Add new settings.
    Object.keys(cleanState).forEach((key) => {
      if (!this.__state.hasOwnProperty(key)) {
        this.__state[key] = cleanState[key];
      }
    });
    // Remove settings that no longer exist.
    Object.keys(this.__state).forEach((key) => {
      if (!cleanState.hasOwnProperty(key)) {
        delete this.__state[key];
      }
    });
  }

  /**
   * Returns the default settings state by reading the current DOM values.
   */
  __getCleanState(): SettingsState {
    return {
      "enable-sound": (document.getElementById("enable-sound") as HTMLInputElement)?.checked ?? false,
      "enable-lighting": (document.getElementById("enable-lighting") as HTMLInputElement)?.checked ?? false,
      "enable-weather": (document.getElementById("enable-weather") as HTMLInputElement)?.checked ?? false,
    };
  }

  /**
   * Applies the stored state to a specific DOM element by its ID.
   */
  __applyState(id: string): void {
    const element = document.getElementById(id) as HTMLInputElement | null;
    if (!element) return;
    element.addEventListener("change", this.__toggle.bind(this));
    // Update the element state based on the stored state.
    switch (id) {
      case "enable-lighting":
      case "enable-weather":
      case "enable-sound":
        element.checked = this.__state[id];
        break;
      default:
        return;
    }
  }
}

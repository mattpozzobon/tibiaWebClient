import Canvas from "./canvas";
import GameClient from "./gameclient";
import Modal from "./modal";
import Outfit from "./outfit";
import Position from "./position";
import { OutfitChangePacket } from "./protocol";
import SpriteBuffer from "./sprite-buffer";


export default class OutfitModal extends Modal {
  ;
  __activeOutfitElement: HTMLElement | null;
  __spriteBuffer: SpriteBuffer;
  __spriteBufferMount: SpriteBuffer;
  __canvas: Canvas;
  __outfit: Outfit | null;
  __mountIndex: number;
  __outfitIndex: number;
  __faceDirection: number;

  constructor(id: string) {
    super(id);
    

    this.__addEventListeners();

    this.__activeOutfitElement = null;
    this.__spriteBuffer = new SpriteBuffer(2);
    this.__spriteBufferMount = new SpriteBuffer(2);

    const outfitExample = document.getElementById("outfit-example");
    if (!(outfitExample instanceof HTMLCanvasElement)) {
      throw new Error("Element with id 'outfit-example' is not a canvas element.");
    }
    this.__canvas = new Canvas( outfitExample, 128, 128);

    this.__outfit = null;
    this.__mountIndex = 0;
    this.__outfitIndex = 0;
    this.__faceDirection = 0;
  }

  public disableAddons(): void {
    (document.getElementById("checkbox-outfit-addon-one") as HTMLInputElement).disabled = true;
    (document.getElementById("checkbox-outfit-addon-two") as HTMLInputElement).disabled = true;
    (document.getElementById("checkbox-outfit-mounted") as HTMLInputElement).disabled = true;
  }

  public handleOpen = (options?: any): void => {
    // Copy over the current player's outfit.
    this.__outfit = window.gameClient.player!.outfit.copy();

    // Default selection of HEAD.
    this.__internalToggleSectionSelect(document.getElementById("outfit-head") as HTMLElement);

    // Overwrite checkboxes with the player's current settings.
    if (!this.__outfit) return;

    (document.getElementById("checkbox-outfit-addon-one") as HTMLInputElement).checked = this.__outfit.addonOne;
    (document.getElementById("checkbox-outfit-addon-two") as HTMLInputElement).checked = this.__outfit.addonTwo;
    (document.getElementById("checkbox-outfit-mounted") as HTMLInputElement).checked = this.__outfit.mounted;

    // Get the indices for the mount and outfit.
    this.__mountIndex = this.__getIndex(window.gameClient.player!.mounts, this.__outfit.mount);
    this.__outfitIndex = this.__getIndex(window.gameClient.player!.outfits, this.__outfit.id);

    if (window.gameClient.player!.mounts.length === 0) {
      const mountSpan = document.getElementById("mount-span");
      if (mountSpan) {
        mountSpan.innerHTML = "Mounts Unavailable";
      }
      (document.getElementById("checkbox-outfit-mounted") as HTMLInputElement).disabled = true;
    } else {
      const mountSpan = document.getElementById("mount-span");
      if (mountSpan) {
        mountSpan.innerHTML = window.gameClient.player!.mounts[this.__mountIndex].name;
      }
    }

    const outfitSpan = document.getElementById("outfit-span");
    if (outfitSpan) {
      outfitSpan.innerHTML = window.gameClient.player!.outfits[this.__outfitIndex].name;
    }

    // Render the preview.
    this.__renderOutfit();
  }

  public handleConfirm = (): boolean => {
    if (!window.gameClient.player!.outfit.equals(this.__outfit!)) {
      window.gameClient.send(new OutfitChangePacket(this.__outfit!));
    }
    return true;
  }

  public handleRender = (): void => {
    if ((document.getElementById("checkbox-animate-outfit") as HTMLInputElement).checked) {
      this.__renderOutfit();
    }
  }

  private __addEventListeners(): void {
    const colorElementWrapper = this.element.querySelector(".outfit-color-picker");
    if (colorElementWrapper) {
      colorElementWrapper.addEventListener("click", this.__handleChangeOutfitColor.bind(this));
    }

    Array.from(this.element.getElementsByClassName("outfit-face-picker")).forEach((element) => {
      element.addEventListener("click", this.__toggleSectionSelect.bind(this));
    });

    document.getElementById("checkbox-outfit-addon-one")?.addEventListener("change", this.__renderOutfit.bind(this));
    document.getElementById("checkbox-outfit-addon-two")?.addEventListener("change", this.__renderOutfit.bind(this));
    document.getElementById("checkbox-outfit-mounted")?.addEventListener("change", this.__renderOutfit.bind(this));
    document.getElementById("checkbox-animate-outfit")?.addEventListener("change", this.__renderOutfit.bind(this));

    document.getElementById("rotate-outfit")?.addEventListener("click", this.__handleRotateOutfit.bind(this));
    document.getElementById("left-outfit")?.addEventListener("click", this.__handleSelectOutfit.bind(this, -1));
    document.getElementById("right-outfit")?.addEventListener("click", this.__handleSelectOutfit.bind(this, 1));

    document.getElementById("left-mount")?.addEventListener("click", this.__handleSelectMount.bind(this, -1));
    document.getElementById("right-mount")?.addEventListener("click", this.__handleSelectMount.bind(this, 1));
  }

  private __getIndex(input: any[], id: number): number {
    for (let i = 0; i < input.length; i++) {
      if (input[i].id === id) {
        return i;
      }
    }
    return 0;
  }

  private __handleSelectMount(value: number): void {
    if (window.gameClient.player!.mounts.length === 0) return;

    this.__mountIndex += value;
    if (this.__mountIndex < 0) {
      this.__mountIndex = window.gameClient.player!.mounts.length - 1;
    } else {
      this.__mountIndex = this.__mountIndex % window.gameClient.player!.mounts.length;
    }

    this.__outfit!.mount = window.gameClient.player!.mounts[this.__mountIndex].id;
    const mountSpan = document.getElementById("mount-span");
    if (mountSpan) {
      mountSpan.innerHTML = window.gameClient.player!.mounts[this.__mountIndex].name;
    }
    this.__renderOutfit();
  }

  private __handleSelectOutfit(value: number): void {
    this.__outfitIndex += value;
    if (this.__outfitIndex < 0) {
      this.__outfitIndex = window.gameClient.player!.outfits.length - 1;
    } else {
      this.__outfitIndex = this.__outfitIndex % window.gameClient.player!.outfits.length;
    }
    this.__outfit!.id = window.gameClient.player!.outfits[this.__outfitIndex].id;
    const outfitSpan = document.getElementById("outfit-span");
    if (outfitSpan) {
      outfitSpan.innerHTML = window.gameClient.player!.outfits[this.__outfitIndex].name;
    }
    this.__renderOutfit();
  }

  private __handleRotateOutfit(event: Event): void {
    this.__faceDirection++;
    this.__faceDirection = this.__faceDirection % 4;
    this.__renderOutfit();
  }

  private __toggleSectionSelect(event: Event): void {
    this.__internalToggleSectionSelect(event.target as HTMLElement);
  }

  private __internalToggleSectionSelect(target: HTMLElement): void {
    if (this.__activeOutfitElement !== null) {
      this.__activeOutfitElement.classList.remove("on");
    }
    target.classList.add("on");
    this.__activeOutfitElement = target;
  }

  private __setOutfitDetail(id: string, index: number): void {
    switch (id) {
      case "outfit-head":
        this.__outfit!.details.head = index;
        break;
      case "outfit-body":
        this.__outfit!.details.body = index;
        break;
      case "outfit-legs":
        this.__outfit!.details.legs = index;
        break;
      case "outfit-feet":
        this.__outfit!.details.feet = index;
        break;
    }
    this.__renderOutfit();
  }

  private __handleChangeOutfitColor(event: Event): void {
    if (this.__activeOutfitElement === null) return;
    const index = (event.target as HTMLElement).getAttribute("index");
    if (index === null) return;
    this.__setOutfitDetail(this.__activeOutfitElement.id, Number(index));
  }

  private __renderOutfit(): void {
    if (this.__outfit === null) return;
    const outfitObject = this.__outfit.getDataObject();
    if (outfitObject === null) return;

    let item: any;
    let mount: any;
    let mountFrame: number;
    let characterFrame: number;

    const animate = (document.getElementById("checkbox-animate-outfit") as HTMLInputElement).checked;
    if (!animate) {
      item = outfitObject.getFrameGroup(0);
      characterFrame = 0;
      if (window.gameClient.clientVersion === 1098) {
        mount = this.__outfit.getDataObjectMount().getFrameGroup(0);
        mountFrame = 0;
      } else {
        mount = 0;
        mountFrame = 0;
      }
    } else {
      item = outfitObject.getFrameGroup(1);
      if (window.gameClient.clientVersion === 1098) {
        mount = this.__outfit.getDataObjectMount().getFrameGroup(1);
        characterFrame = mount.getAlwaysAnimatedFrame();
        mountFrame = mount.getAlwaysAnimatedFrame();
      } else {
        characterFrame = item.getAlwaysAnimatedFrame();
        mount = 0;
        mountFrame = 0;
      }
    }

    // Update outfit properties based on checkboxes.
    (this.__outfit as any).mounted = (document.getElementById("checkbox-outfit-mounted") as HTMLInputElement).checked;
    (this.__outfit as any).addonOne = (document.getElementById("checkbox-outfit-addon-one") as HTMLInputElement).checked;
    (this.__outfit as any).addonTwo = (document.getElementById("checkbox-outfit-addon-two") as HTMLInputElement).checked;

    const zPattern = (item.pattern.z > 1 && (this.__outfit as any).mounted) ? 1 : 0;

    this.__canvas.clear();
    this.__spriteBuffer.clear();

    // TODO: Implement this.__canvas.__drawCharacter
    // this.__canvas.__drawCharacter(
    //   this.__spriteBuffer,
    //   this.__spriteBufferMount,
    //   this.__outfit,
    //   new Position(1, 1, 0),
    //   item,
    //   mount,
    //   characterFrame,
    //   mountFrame,
    //   this.__faceDirection,
    //   zPattern,
    //   64,
    //   0.25
    // );
  }
}

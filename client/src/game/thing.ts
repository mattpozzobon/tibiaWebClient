import { DataObject } from "../core/dataobject";
import Sprite from "../renderer/sprite";
import { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";
import Container from "./container";
import Tile from "./tile";

export default class Thing {
  public id: number;
  public __parent: Tile | Container | null = null;
  protected DEFAULT_FRAME_LENGTH_MS: number = 500;
  public __durations: number[] = [];
  private __durationsSum: number = 0;

  constructor(id: number) {
    
    this.id = id;

    if (this.id !== 0 && window.gameClient.hasExtendedAnimations() && this.isAnimated()) {
      this.__generateExtendedDurations();
    }
  }
  
    setParent(parent: Tile | Container): void {
      /*
       * Function Thing.setParent
       * Sets the parent of a thing: e.g., a tile or container
       */
      this.__parent = parent;
    }
  
    isAnimated(): boolean {
      /*
       * Function Thing.isAnimated
       * Returns true if the thing is animated
       */
      return this.getFrameGroup(FrameGroup.NONE).animationLength > 1;
    }
  
    getFrame(): number {
      /*
       * Function Thing.getFrame
       * Returns the current frame of the thing
       */
      return this.isAnimated() ? this.__getGlobalFrame() : 0;
    }
  
    isMultiUse(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagMultiUse);
    }
  
    isElevation(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagElevation);
    }
  
    isRotateable(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagRotateable);
    }
  
    isPickupable(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagPickupable);
    }
  
    isSplash(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagSplash);
    }
  
    isStackable(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagStackable);
    }
  
    isFluidContainer(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagFluidContainer);
    }
  
    isLight(): boolean {
      return this.hasFlag(PropBitFlag.DatFlagLight);
    }
  
    __getGlobalFrame(): number {
      /*
       * Function Thing.__getGlobalFrame
       * Returns frame from a global counter that is not specific to a single item (e.g. patterns)
       */
      let frameGroup = this.getFrameGroup(FrameGroup.NONE);
  
      if (!window.gameClient.hasExtendedAnimations()) {
        return Math.floor((window.gameClient.renderer.__nMiliseconds / this.DEFAULT_FRAME_LENGTH_MS) % frameGroup.animationLength);
      }
  
      let delta = window.gameClient.renderer.__nMiliseconds % this.__durationsSum;
      for (let i = 0; i < this.__durations.length; i++) {
        if (this.__durations[i] >= delta) {
          return i;
        }
      }
  
      return 0;
    }
  
    getMinimapColor(): number | null {
      /*
       * Function Thing.getMinimapColor
       * Returns the minimap color of a thing
       */
      if (this.id === 0) return null;
      if (!this.hasFlag(PropBitFlag.DatFlagMinimapColor)) return null;
      return this.getDataObject().properties.minimapColor;
    }
  
    getSprite(group: number, index: number): Sprite | null {
      /*
       * Function Thing.getSprite
       * Wraps a call to the data object
       */
      return this.getDataObject().frameGroups[group].getSprite(index);
    }
  
    getFrameGroup(group: number): FrameGroup {
      return this.getDataObject().frameGroups[group];
    }
  
    getDataObject(): DataObject {
      /*
       * Function Thing.getDataObject
       * Returns the data object based on the identifier
       */
      return window.gameClient.dataObjects.get(this.id);
    }
  
    hasFlag(flag: string | number): boolean {
      /*
       * Function Thing.hasFlag
       * Returns whether the flag in the data object is set
       */
      return this.getDataObject().flags.get(flag);
    }
  
    private __generateExtendedDurations(): void {
      /*
       * Function Thing.__generateExtendedDurations
       * Generates the cumulative duration for all of the extended frames
       */
      let durations = this.getFrameGroup(FrameGroup.NONE).animationLengths;
      let sum = 0;
  
      this.__durations = durations.map(duration => {
        return sum += Math.floor(Math.random() * (duration.max - duration.min + 1)) + duration.min;
      });
  
      this.__durationsSum = sum;
    }
  }
  
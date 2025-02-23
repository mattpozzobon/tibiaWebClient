export interface PropFlags {
  DatFlagGround: number;
  DatFlagGroundBorder: number;
  DatFlagOnBottom: number;
  DatFlagOnTop: number;
  DatFlagContainer: number;
  DatFlagStackable: number;
  DatFlagForceUse: number;
  DatFlagMultiUse: number;
  DatFlagWritable: number;
  DatFlagWritableOnce: number;
  DatFlagFluidContainer: number;
  DatFlagSplash: number;
  DatFlagNotWalkable: number;
  DatFlagNotMoveable: number;
  DatFlagBlockProjectile: number;
  DatFlagNotPathable: number;
  DatFlagNoMoveAnimation: number;
  DatFlagPickupable: number;
  DatFlagHangable: number;
  DatFlagHookSouth: number;
  DatFlagHookEast: number;
  DatFlagRotateable: number;
  DatFlagLight: number;
  DatFlagDontHide: number;
  DatFlagTranslucent: number;
  DatFlagDisplacement: number;
  DatFlagElevation: number;
  DatFlagLyingCorpse: number;
  DatFlagAnimateAlways: number;
  DatFlagMinimapColor: number;
}

export default class BitFlagGenerator implements PropFlags {
  // These properties are declared so that they’re accessible as:
  // PropBitFlag.DatFlagNotWalkable, etc.
  public DatFlagGround!: number;
  public DatFlagGroundBorder!: number;
  public DatFlagOnBottom!: number;
  public DatFlagOnTop!: number;
  public DatFlagContainer!: number;
  public DatFlagStackable!: number;
  public DatFlagForceUse!: number;
  public DatFlagMultiUse!: number;
  public DatFlagWritable!: number;
  public DatFlagWritableOnce!: number;
  public DatFlagFluidContainer!: number;
  public DatFlagSplash!: number;
  public DatFlagNotWalkable!: number;
  public DatFlagNotMoveable!: number;
  public DatFlagBlockProjectile!: number;
  public DatFlagNotPathable!: number;
  public DatFlagNoMoveAnimation!: number;
  public DatFlagPickupable!: number;
  public DatFlagHangable!: number;
  public DatFlagHookSouth!: number;
  public DatFlagHookEast!: number;
  public DatFlagRotateable!: number;
  public DatFlagLight!: number;
  public DatFlagDontHide!: number;
  public DatFlagTranslucent!: number;
  public DatFlagDisplacement!: number;
  public DatFlagElevation!: number;
  public DatFlagLyingCorpse!: number;
  public DatFlagAnimateAlways!: number;
  public DatFlagMinimapColor!: number;

  // You may also want to keep a lookup for the flag names.
  public flags: Record<string, number> = {};
  private flag: number = 0;

  constructor(flagNames: (keyof PropFlags)[]) {
    if (flagNames.length > 31) {
      throw new Error("Cannot construct bit flag with more than 31 options.");
    }

    flagNames.forEach((flag, i) => {
      const value = 1 << i;
      this.flags[flag as string] = value;
      // Expose the flag as a property on the instance.
      (this as any)[flag] = value;
    });
  }

  getFlags(): Record<string, number> {
    return this.flags;
  }

  get(flag: string | number): boolean {
    if (typeof flag === "number") {
      return !!(this.flag & flag);
    } else {
      return !!(this.flag & this.flags[flag]);
    }
  }

  set(flag: string | number): void {
    if (typeof flag === "number") {
      this.flag |= flag;
    } else {
      if (!(flag in this.flags)) {
        throw new Error(`Flag '${flag}' does not exist.`);
      }
      this.flag |= this.flags[flag];
    }
  }

  unset(flag: string | number): void {
    if (typeof flag === "number") {
      this.flag &= ~flag;
    } else {
      if (!(flag in this.flags)) {
        throw new Error(`Flag '${flag}' does not exist.`);
      }
      this.flag &= ~this.flags[flag];
    }
  }

  print(): void {
    Object.keys(this.flags).forEach(flag => {
      if (this.get(flag)) {
        console.log(flag);
      }
    });
  }
}

// ✅ Create an instance of the flag bit manager.
export const PropBitFlag = new BitFlagGenerator([
  "DatFlagGround",
  "DatFlagGroundBorder",
  "DatFlagOnBottom",
  "DatFlagOnTop",
  "DatFlagContainer",
  "DatFlagStackable",
  "DatFlagForceUse",
  "DatFlagMultiUse",
  "DatFlagWritable",
  "DatFlagWritableOnce",
  "DatFlagFluidContainer",
  "DatFlagSplash",
  "DatFlagNotWalkable",
  "DatFlagNotMoveable",
  "DatFlagBlockProjectile",
  "DatFlagNotPathable",
  "DatFlagNoMoveAnimation",
  "DatFlagPickupable",
  "DatFlagHangable",
  "DatFlagHookSouth",
  "DatFlagHookEast",
  "DatFlagRotateable",
  "DatFlagLight",
  "DatFlagDontHide",
  "DatFlagTranslucent",
  "DatFlagDisplacement",
  "DatFlagElevation",
  "DatFlagLyingCorpse",
  "DatFlagAnimateAlways",
  "DatFlagMinimapColor",
]);


export interface OutfitDetails {
    head: number;
    body: number;
    legs: number;
    feet: number;
}
  
export interface OutfitEquipment {
    hair: number;
    head: number;
    body: number;
    legs: number;
    feet: number;
    lefthand: number;
    righthand: number;
}

export default class Outfit {
    id: number;
    details: OutfitDetails;
    equipment: OutfitEquipment;
    mount: number;
    mounted: boolean;
    addonOne: boolean;
    addonTwo: boolean;
  
    static colors: number[] = [
      0xFFFFFF, 0xBFD4FF, 0xBFE9FF, 0xBFFFFF, 0xBFFFE9, 0xBFFFD4, 0xBFFFBF,
      0xD4FFBF, 0xE9FFBF, 0xFFFFBF, 0xFFE9BF, 0xFFD4BF, 0xFFBFBF, 0xFFBFD4,
      0xFFBFE9, 0xFFBFFF, 0xE9BFFF, 0xD4BFFF, 0xBFBFFF, 0xDADADA, 0x8F9FBF,
      0x8FAFBF, 0x8FBFBF, 0x8FBFAF, 0x8FBF9F, 0x8FBF8F, 0x9FBF8F, 0xAFBF8F,
      0xBFBF8F, 0xBFAF8F, 0xBF9F8F, 0xBF8F8F, 0xBF8F9F, 0xBF8FAF, 0xBF8FBF,
      0xAF8FBF, 0x9F8FBF, 0x8F8FBF, 0xB6B6B6, 0x5F7FBF, 0x8FAFBF, 0x5FBFBF,
      0x5FBF9F, 0x5FBF7F, 0x5FBF5F, 0x7FBF5F, 0x9FBF5F, 0xBFBF5F, 0xBF9F5F,
      0xBF7F5F, 0xBF5F5F, 0xBF5F7F, 0xBF5F9F, 0xBF5FBF, 0x9F5FBF, 0x7F5FBF,
      0x5F5FBF, 0x919191, 0x3F6ABF, 0x3F94BF, 0x3FBFBF, 0x3FBF94, 0x3FBF6A,
      0x3FBF3F, 0x6ABF3F, 0x94BF3F, 0xBFBF3F, 0xBF943F, 0xBF6A3F, 0xBF3F3F,
      0xBF3F6A, 0xBF3F94, 0xBF3FBF, 0x943FBF, 0x6A3FBF, 0x3F3FBF, 0x6D6D6D,
      0x0055FF, 0x00AAFF, 0x00FFFF, 0x00FFAA, 0x00FF54, 0x00FF00, 0x54FF00,
      0xAAFF00, 0xFFFF00, 0xFFA900, 0xFF5500, 0xFF0000, 0xFF0055, 0xFF00A9,
      0xFF00FE, 0xAA00FF, 0x5500FF, 0x0000FF, 0x484848, 0x003FBF, 0x007FBF,
      0x00BFBF, 0x00BF7F, 0x00BF3F, 0x00BF00, 0x3FBF00, 0x7FBF00, 0xBFBF00,
      0xBF7F00, 0xBF3F00, 0xBF0000, 0xBF003F, 0xBF007F, 0xBF00BF, 0x7F00BF,
      0x3F00BF, 0x0000BF, 0x242424, 0x002A7F, 0x00557F, 0x007F7F, 0x007F55,
      0x007F2A, 0x007F00, 0x2A7F00, 0x557F00, 0x7F7F00, 0x7F5400, 0x7F2A00,
      0x7F0000, 0x7F002A, 0x7F0054, 0x7F007F, 0x55007F, 0x2A007F, 0x00007F
    ];
  
    constructor(
      outfit: {
        id: number;
        details: OutfitDetails;
        equipment: OutfitEquipment;
        mount: number;
        mounted: boolean;
        addonOne: boolean;
        addonTwo: boolean;
    }) {
      
      this.id = outfit.id;
      this.details = outfit.details;
      this.equipment = outfit.equipment;
      this.mount = outfit.mount;
      this.mounted = outfit.mounted;
      this.addonOne = outfit.addonOne;
      this.addonTwo = outfit.addonTwo;

      this.equipment.hair = 905;
      this.equipment.body = 908;
      //this.equipment.legs = 910;
      this.equipment.feet = 909;
      //this.equipment.righthand = 920;
    }
  
    equals(other: Outfit): boolean {
      return JSON.stringify(this.serialize()) === JSON.stringify(other.serialize());
    }
  
    hasLookDetails(): boolean {
      return this.getDataObject().frameGroups[0].layers > 1;
    }
  
    copy(): Outfit {
      return new Outfit(this.serialize());
    }
  
    serialize() {
      return {
        id: this.id,
        details: { ...this.details },
        equipment: { ...this.equipment },
        mount: this.mount,
        mounted: this.mounted,
        addonOne: this.addonOne,
        addonTwo: this.addonTwo,
      };
    }
  
    toIdAndDetailsString(): string {
      return [
        `[ID]: ${this.id}`,
        `[Colours]: (${this.details.head}, ${this.details.body}, ${this.details.legs}, ${this.details.feet})`
      ].join(" ");
    }
    
    toEquipmentString(): string {
      return [
        `[Equipment]: (${this.equipment.hair}, (${this.equipment.head}, ${this.equipment.body}, ${this.equipment.legs}, ${this.equipment.feet}, ${this.equipment.lefthand}, ${this.equipment.righthand})`
      ].join(" ");
    }
  
    getSpriteBufferSize(object: any): number {
      return Math.ceil(Math.sqrt(object.frameGroups.reduce((a: number, b: any) => a + 4 * b.width * b.height * b.animationLength, 0)));
    }
  
    getDataObjectMount(): any {
      return window.gameClient.dataObjects.getOutfit(this.mount);
    }
  
    getLeftHandDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.lefthand);
    }
  
    getRightHandDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.righthand);
    }
  
    getHairDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.hair);
    }
  
    getHeadDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.head);
    }
  
    getBodyDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.body);
    }
  
    getLegsDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.legs);
    }
  
    getFeetDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.equipment.feet);
    }
  
    getDataObject(): any {
      return window.gameClient.dataObjects.getOutfit(this.id);
    }
  
    getColor(which: number): number {
      return Outfit.colors[which];
    }
}
  
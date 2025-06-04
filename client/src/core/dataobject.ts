"use strict";

import BitFlagGenerator, { PropBitFlag } from "../utils/bitflag";
import FrameGroup from "../utils/frame-group";

interface IDataObjectProperties {
  [key: string]: any;
}

class DataObject {
  public flags: BitFlagGenerator;
  public properties: IDataObjectProperties;
  public frameGroups: FrameGroup[];
  public groupCount: number;

  constructor({ flags, properties }: { flags: BitFlagGenerator; properties: IDataObjectProperties }) {
    /*
     * Class DataObject
     * Container for a generic data object class: these definitions are loaded from Tibia.dat
     *
     * API:
     *
     * DataObject.isAlwaysAnimated() - Returns true if the data object is always animated
     * DataObject.setGroupCount(count) - Sets the group count of the data object
     * DataObject.getFrameGroup(group) - Returns the frame group for a particular state
     *
     */
    this.flags = flags;
    this.properties = properties;
    this.frameGroups = [];
    this.groupCount = 1;
  }

  isAlwaysAnimated(): boolean {
    /*
     * Function DataObject.isAlwaysAnimated
     * Returns true when the object is supposed to be always animated (not only when moving like flying wasps)
     */
    return this.flags.get("DatFlagAnimateAlways");
  }

  setGroupCount(count: number): void {
    /*
     * Function DataObject.setGroupCount
     * Sets the group count of the data object
     */
    this.groupCount = count;
  }

  getFrameGroup(group: number): FrameGroup {
    /*
     * Function DataObject.getFrameGroup
     * Returns the requested frame group
     */
    if (this.groupCount === 1) {
      return this.frameGroups[FrameGroup.NONE];
    }
    return this.frameGroups[Math.max(0, Math.min(group, this.groupCount - 1))];
  }
}

export { DataObject, IDataObjectProperties };

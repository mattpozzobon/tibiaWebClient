import Modal from "./modal";

export default class ConfirmModal extends Modal {
  private __confirmCallback: () => void;

  constructor(id: string) {
    super(id);
    this.__confirmCallback = () => {};
  }

  /**
   * Sets the confirm callback to be executed when confirm is pressed.
   * @param callback - The callback function.
   */
  // Override handleOpen as a property that accepts a callback.
  public handleOpen = (callback: () => void): void => {
    this.__confirmCallback = callback;
  };

  // Override handleConfirm as a property to match the base class.
  public handleConfirm: () => boolean = () => {
    this.__confirmCallback();
    // Reset the callback to a no-op function.
    this.__confirmCallback = () => {};
    return true;
  };
}

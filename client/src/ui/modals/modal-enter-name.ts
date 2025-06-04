import Modal from "./modal";

export default class EnterNameModal extends Modal {
  private __confirmCallback: (name: string) => void;

  constructor(id: string) {
    super(id);
    
    this.__confirmCallback = () => {};
  }

  /**
   * Sets a callback to be executed when the modal is confirmed.
   */
  public setConfirmCallback(callback: (name: string) => void): void {
    this.__confirmCallback = callback;
  }

  public handleOpen = (): void => {
    // Focus on the input with id "enter-name".
    const input = document.getElementById("enter-name") as HTMLInputElement | null;
    input?.focus();
  }

  public handleConfirm = (): boolean => {
    // Retrieve the name from the input element.
    const input = document.getElementById("enter-name") as HTMLInputElement | null;
    const name = input ? input.value : "";
    
    // Execute the callback and then reset it.
    this.__confirmCallback(name);
    this.__confirmCallback = () => {};
    return true;
  }
}

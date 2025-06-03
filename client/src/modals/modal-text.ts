import Modal from "./modal";

export default class TextModal extends Modal {
  constructor(id: string) {
    super(id);
  }

  public handleOpen = (x: string): void => {
    const feedback = document.getElementById("serve-feedback");
    if (feedback) {
      feedback.innerHTML = x;
    }
  }
}

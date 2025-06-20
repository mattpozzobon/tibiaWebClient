import { auth } from "../../config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import Modal from "./modal";

export default class RecoverAccountModal extends Modal {
  constructor(id: string) {
    super(id);
  
    document.getElementById("recover-account-button")?.addEventListener("click", this.handleConfirm);
  
    document.getElementById("auth-back-button")?.addEventListener("click", () => {
      this.resetForm();
      window.gameClient.interface.modalManager.handleEscape();
    });
  }

  public handleOpen = (): void => {
    this.resetForm();
    const backBtn = document.getElementById("auth-back-button");
    if (backBtn) backBtn.style.display = "block";
  };

  public handleCancel: () => boolean = () => {
    this.resetForm();
    window.gameClient.interface.modalManager.handleEscape();
    return true;
  };

  private resetForm(): void {
    const emailInput = document.getElementById("recover-email") as HTMLInputElement;
    emailInput.value = "";
    emailInput.classList.remove("input-valid", "input-invalid");
    (document.getElementById("auth-error") as HTMLElement).textContent = "";
  }

  private __validateEmail(): boolean {
    const email = (document.getElementById("recover-email") as HTMLInputElement).value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const input = document.getElementById("recover-email") as HTMLInputElement;
  
    input.classList.remove("input-valid", "input-invalid");
    input.classList.add(isValid ? "input-valid" : "input-invalid");
  
    return isValid;
  }

  public handleConfirm: () => boolean = () => {
    const email = (document.getElementById("recover-email") as HTMLInputElement).value.trim();
    const errorBox = document.getElementById("auth-error")!;
    errorBox.textContent = "";
    errorBox.style.color = "red";
  
    if (!this.__validateEmail()) {
      errorBox.textContent = "Please enter a valid email address.";
      return false;
    }
  
    sendPasswordResetEmail(auth, email)
      .then(() => {
        errorBox.style.color = "lightgreen";
        errorBox.textContent = "Recovery email sent. Check your inbox.";
      })
      .catch((err: any) => {
        let message = "Failed to send recovery email.";
        switch (err.code) {
          case "auth/user-not-found":
            message = "No user found with that email.";
            break;
          case "auth/invalid-email":
            message = "Invalid email address.";
            break;
        }
        errorBox.textContent = message;
      });
  
    // Don't close the modal immediately; let user read the message
    return false;
  };
}

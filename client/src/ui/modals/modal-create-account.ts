import { auth } from "../../firebase";
import Modal from "./modal";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default class CreateAccountModal extends Modal {
  constructor(id: string) {
    super(id);
    document.getElementById("create-account-close")?.addEventListener("click", this.handleConfirm);
    document.getElementById("create-password")?.addEventListener("input", () => {
      this.__updatePasswordStrength();
      this.__checkPasswordMatch();
      this.__toggleSubmit();
    });
    document.getElementById("create-confirm-password")?.addEventListener("input", () => {
      this.__checkPasswordMatch();
      this.__toggleSubmit();
    });
    document.getElementById("create-username")?.addEventListener("input", () => {
      this.__validateEmail();
      this.__toggleSubmit();
    });

    document.getElementById("auth-back-button")?.addEventListener("click", () => {
      this.resetForm();
      window.gameClient.interface.modalManager.open("floater-enter");
    });
  }

  public handleOpen = (): void => {
    console.log('handleOpen create account');
    this.resetForm();
    const backBtn = document.getElementById("auth-back-button");
    if (backBtn) backBtn.style.display = "block";
  };

  public handleCancel: () => boolean = () => {
    this.resetForm();
    window.gameClient.interface.modalManager.open("floater-enter");
    return true;
  };

  private resetForm(): void {
    const fields = [
      { inputId: "create-username", hintId: "email-validation" },
      { inputId: "create-password", hintId: "password-strength" },
      { inputId: "create-confirm-password", hintId: "password-match" }
    ];
  
    for (const { inputId, hintId } of fields) {
      const input = document.getElementById(inputId) as HTMLInputElement;
      const hint = document.getElementById(hintId) as HTMLElement;
      input.value = "";
      input.style.border = "1px solid #444";
      hint.textContent = "";
    }
  
    (document.getElementById("firebase-error") as HTMLElement).textContent = "";
  }

  private __setValidationState(inputId: string, messageId: string, isValid: boolean, message: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    const hint = document.getElementById(messageId) as HTMLElement;

    input.style.border = isValid ? "1px solid #444" : "1px solid red";
    hint.textContent = message;
    hint.style.color = isValid ? "lightgreen" : "red";
  }

  private __validateEmail(): boolean {
    const email = (document.getElementById("create-username") as HTMLInputElement).value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    this.__setValidationState("create-username", "email-validation", isValid, isValid ? "Valid email" : "Invalid email format");
    return isValid;
  }

  private __updatePasswordStrength(): boolean {
    const val = (document.getElementById("create-password") as HTMLInputElement).value;
    let level: "weak" | "medium" | "strong" = "weak";

    if (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(val)) level = "strong";
    else if (/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(val)) level = "medium";

    const messages = {
      weak: "Weak password",
      medium: "Medium strength",
      strong: "Strong password"
    };

    const isValid = level !== "weak";
    this.__setValidationState("create-password", "password-strength", isValid, messages[level]);
    return isValid;
  }

  private __checkPasswordMatch(): boolean {
    const password = (document.getElementById("create-password") as HTMLInputElement).value;
    const confirm = (document.getElementById("create-confirm-password") as HTMLInputElement).value;
    const matches = password === confirm;

    this.__setValidationState("create-confirm-password", "password-match", matches, matches ? "Passwords match" : "Passwords do not match");
    return matches;
  }

  private __toggleSubmit(): void {
    const isValid = this.__validateEmail() && this.__updatePasswordStrength() && this.__checkPasswordMatch();
    const button = document.getElementById("create-account-close") as HTMLButtonElement;
    button.disabled = !isValid;
  }

  private __isValidForm(): boolean {
    const emailValid = this.__validateEmail();
    const passValid = this.__updatePasswordStrength();
    const matchValid = this.__checkPasswordMatch();
    return emailValid && passValid && matchValid;
  }

  public handleConfirm: () => boolean = () => {
    const email = (document.getElementById("create-username") as HTMLInputElement).value.trim();
    const password = (document.getElementById("create-password") as HTMLInputElement).value;
    const errorBox = document.getElementById("firebase-error")!;
    errorBox.textContent = "";

    if (!this.__isValidForm()) return false;

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        (document.getElementById("user-username") as HTMLInputElement).value = email;
        (document.getElementById("user-password") as HTMLInputElement).value = password;
        window.gameClient.interface.modalManager.close();
        window.gameClient.interface.modalManager.open("floater-enter");
      })
      .catch((err: any) => {
        let message = "Account creation failed.";
        switch (err.code) {
          case "auth/email-already-in-use":
            message = "That email is already in use.";
            break;
          case "auth/invalid-email":
            message = "The email address is not valid.";
            break;
          case "auth/weak-password":
            message = "Password is too weak (minimum 6 characters).";
            break;
          case "auth/operation-not-allowed":
            message = "Account creation is disabled. Contact support.";
            break;
        }
        errorBox.textContent = message;
      });

    return false;
  };
}

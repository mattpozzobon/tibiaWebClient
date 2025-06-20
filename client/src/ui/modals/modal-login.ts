import { auth } from "../../config/firebase";
import Modal from "./modal";
import { signInWithEmailAndPassword } from "firebase/auth";

export default class LoginModal extends Modal {
  constructor(id: string) {
    super(id);
    document.getElementById("enter-game")?.addEventListener("click", this.handleConfirm);
  }

  private __clearValidation(): void {
    ["user-username", "user-password"].forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      input.style.border = "1px solid #444";
    });
    const errorBox = document.getElementById("auth-error")!;
    errorBox.textContent = "";
  }

  public override handleOpen(): void {
    const backBtn = document.getElementById("auth-back-button");
    if (backBtn) {
      backBtn.style.display = "none";
    }
  }

  public handleConfirm: () => boolean = () => {
    const emailInput = document.getElementById("user-username") as HTMLInputElement;
    const passInput  = document.getElementById("user-password") as HTMLInputElement;
    const errorBox = document.getElementById("auth-error")!;

    const email    = emailInput.value.trim();
    const password = passInput.value;

    this.__clearValidation();

    let valid = true;
    if (!email || email.length < 6 || !email.includes("@")) {
      emailInput.style.border = "1px solid red";
      valid = false;
    }
    if (!password || password.length < 6) {
      passInput.style.border = "1px solid red";
      valid = false;
    }

    if (!valid) return false;

    signInWithEmailAndPassword(auth, email, password)
      .then(cred => cred.user.getIdToken())
      .then(token => {
        window.gameClient.networkManager.openGameSocket(token);
        window.gameClient.interface.modalManager.close();
      })
      .catch((err: any) => {
        let message = "Login failed.";
        switch (err.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
            message = "Incorrect email or password.";
            break;
          case "auth/invalid-email":
            message = "Invalid email format.";
            break;
          case "auth/too-many-requests":
            message = "Too many failed attempts. Try again later.";
            break;
        }
        errorBox.textContent = message;
      });

    return false;
  };

  public override handleCancel: () => boolean = () => {
    return false;
  };
}

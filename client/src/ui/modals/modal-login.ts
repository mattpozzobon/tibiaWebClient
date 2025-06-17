// src/components/modal-login.ts

import { auth } from "../../firebase";
import Modal from "./modal";
import { signInWithEmailAndPassword } from "firebase/auth";

export default class LoginModal extends Modal {
  constructor(id: string) {
    super(id);
    document
      .getElementById("enter-game")
      ?.addEventListener("click", this.handleConfirm);
  }

  private __clearValidation(): void {
    ["user-username", "user-password"].forEach(id => {
      const el = document.getElementById(id) as HTMLElement;
      if (el) el.style.border = "";
    });
  }

  private __isValidSubmission(email: string, password: string): boolean {
    this.__clearValidation();
    let valid = true;
    if (!email || email.length < 6 || !email.includes("@")) {
      (document.getElementById("user-username") as HTMLInputElement).style.border = "1px solid red";
      valid = false;
    }
    if (!password || password.length < 6) {
      (document.getElementById("user-password") as HTMLInputElement).style.border = "1px solid red";
      valid = false;
    }
    return valid;
  }

  public handleConfirm: () => boolean = () => {
    const emailInput = document.getElementById("user-username") as HTMLInputElement;
    const passInput  = document.getElementById("user-password") as HTMLInputElement;

    const email    = emailInput.value.trim();
    const password = passInput.value;

    if (!this.__isValidSubmission(email, password)) {
      return false;
    }

    // Perform async login via Firebase
    signInWithEmailAndPassword(auth, email, password)
      .then(cred => cred.user.getIdToken())
      .then(token => {
        // Now perform handshake + open WebSocket:
        window.gameClient.networkManager.openGameSocket(token);
        window.gameClient.interface.modalManager.close();
      })
      .catch((err: any) => {
        window.gameClient.interface.modalManager.open("floater-connecting", err.message);
      });

    // Return false so the base modal does not auto-close prematurely
    return false;
  };
}

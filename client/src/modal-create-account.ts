import GameClient from "./gameclient";
import Modal from "./modal";

interface CreateAccountOptions {
  account: string;
  password: string;
  name: string;
  sex: string;
}

export default class CreateAccountModal extends Modal {
  ;

  constructor(id: string) {
    super(id);
    
  }

  private __isValidSubmission(options: CreateAccountOptions): boolean {
    // Clear any previous error styling.
    (document.getElementById("create-username") as HTMLInputElement).style.border = "";
    (document.getElementById("create-password") as HTMLInputElement).style.border = "";
    (document.getElementById("create-name") as HTMLInputElement).style.border = "";
    (document.getElementById("create-sex") as HTMLInputElement).style.border = "";

    if (options.account === "" || options.password === "" || options.name === "") {
      return false;
    }
    if (options.sex !== "male" && options.sex !== "female") {
      return false;
    }
    if (options.account.length < 6) {
      (document.getElementById("create-username") as HTMLInputElement).style.border = "1px solid red";
      return false;
    }
    if (options.password.length < 6) {
      (document.getElementById("create-password") as HTMLInputElement).style.border = "1px solid red";
      return false;
    }
    return true;
  }

  public handleConfirm: () => boolean = () => {
    const accountInput = document.getElementById("create-username") as HTMLInputElement;
    const passwordInput = document.getElementById("create-password") as HTMLInputElement;
    const nameInput = document.getElementById("create-name") as HTMLInputElement;
    const sexInput = document.getElementById("create-sex") as HTMLInputElement;

    const options: CreateAccountOptions = {
      account: accountInput.value,
      password: passwordInput.value,
      name: nameInput.value.toLowerCase(),
      sex: sexInput.value,
    };

    if (!this.__isValidSubmission(options)) {
      return false;
    }

    window.gameClient.networkManager.createAccount(options);
    return true;
  };
}

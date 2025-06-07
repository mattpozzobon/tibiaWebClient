import Modal from "./modal";

interface CreateAccountOptions {
  account: string;
  password: string;
}

export default class CreateAccountModal extends Modal {
  constructor(id: string) {
    super(id);
    document.getElementById("create-account-close")?.addEventListener("click", this.handleConfirm.bind(this));
  }

  private __clearValidation(): void {
    ["create-username", "create-password", "create-confirm-password"].forEach(id => {
      const el = document.getElementById(id) as HTMLElement;
      if (el) el.style.border = "";
    });
  }

  private __isValidSubmission(options: CreateAccountOptions, confirm: string): boolean {
    this.__clearValidation();

    let valid = true;
    if (!options.account || options.account.length < 6) {
      (document.getElementById("create-username") as HTMLInputElement).style.border = "1px solid red";
      valid = false;
    }
    if (!options.password || options.password.length < 6) {
      (document.getElementById("create-password") as HTMLInputElement).style.border = "1px solid red";
      valid = false;
    }
    if (options.password !== confirm) {
      (document.getElementById("create-confirm-password") as HTMLInputElement).style.border = "1px solid red";
      valid = false;
    }
    return valid;
  }

  public handleConfirm: () => boolean = () => {
    const accountInput = document.getElementById("create-username") as HTMLInputElement;
    const passwordInput = document.getElementById("create-password") as HTMLInputElement;
    const confirmInput = document.getElementById("create-confirm-password") as HTMLInputElement;

    const options: CreateAccountOptions = {
      account: accountInput.value.trim(),
      password: passwordInput.value
    };
    const confirm = confirmInput.value;

    if (!this.__isValidSubmission(options, confirm)) {
      return false;
    }

    window.gameClient.networkManager.createAccount({account: options.account,password: options.password});
    return true;
  };
}

import Modal from "./modal";

interface ReadableModalPacket {
  content: string;
  writeable: boolean;
  name: string;
}

export default class ReadableModal extends Modal {
  constructor(id: string) {
    super(id);
  }

  public handleOpen = (packet: ReadableModalPacket): void => {
    const textArea = document.getElementById("book-text-area") as HTMLTextAreaElement | null;
    if (textArea) {
      textArea.value = packet.content;
      textArea.disabled = !packet.writeable;
    }
    this.setTitle(packet.name);
  }
}

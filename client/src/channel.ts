import GameClient from "./gameclient";
import Interface from "./interface";

// Assume these interfaces and classes are defined/imported from elsewhere:
interface IMessage {
  message: string;
  name: string;
  createNode(): Node;
}

declare class CharacterMessage implements IMessage {
  message: string;
  name: string;
  constructor(message: string, type: number, name: string, color: number);
  createNode(): Node;
}

declare class Message implements IMessage {
  message: string;
  name: string;
  constructor(message: string, color: number);
  createNode(): Node;
}

export default class Channel {
  ;
  public name: string;
  public id: number | null;
  public element: HTMLElement;
  public MAX_MESSAGE_COUNT: number = 100;
  private __contents: IMessage[];

  constructor(name: string, id: number | null) {
    
    this.name = name;
    this.id = id;
    this.__contents = [];
    this.element = this.__createElement(name);
  }

  public close(): void {
    // Delegate channel closure to the channel manager.
    window.gameClient.interface.channelManager.closeChannel(this);
  }

  public addPrivateMessage(message: string, name: string): void {
    // Private messages are colored skyblue.
    this.addMessage(message, 0, name, Interface.COLORS.SKYBLUE);
  }

  public addMessage(message: string, type: number, name: string, color: number): void {
    // Wrap the message in a CharacterMessage and add it.
    this.__addMessage(new CharacterMessage(message, type, name, color));
  }

  public blink(): void {
    // Change the channel tab color to indicate a new message.
    this.element.style.color = "orange";
  }

  public lastMessageSelf(): string | null {
    if (this.isEmpty()) {
      return null;
    }
    // Filter messages where the sender is the current player.
    const filtered = this.__contents.filter((msg) => window.gameClient.player!.vitals.name === msg.name);
    return filtered.length ? filtered[filtered.length - 1].message : null;
  }

  public lastMessage(): string | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.__contents[this.__contents.length - 1].message;
  }

  public isEmpty(): boolean {
    return this.__contents.length === 0;
  }

  private __isScrolledDown(chatbox: HTMLElement): boolean {
    return chatbox.scrollTop === chatbox.scrollHeight - chatbox.offsetHeight;
  }

  public render(): void {
    const chatbox = document.getElementById("chat-text-area");
    if (!chatbox) return;

    const scrollDown = this.__isScrolledDown(chatbox);
    chatbox.innerHTML = "";

    if (this.isEmpty()) {
      chatbox.innerHTML = this.__getEmptyMessage();
      return;
    }

    this.__contents.forEach((message) => {
      chatbox.appendChild(message.createNode());
    });

    if (scrollDown) {
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  }

  public click(event: Event): void {
    // When the tab is clicked, set this channel as active.
    window.gameClient.interface.channelManager.setActiveChannelElement(this);
  }

  public select(): void {
    // Mark the channel as selected, render its messages, and reset its color.
    this.element.className = "chat-title selected";
    this.render();
    this.element.style.color = "";
  }

  public clear(): boolean {
    this.__contents = [];
    this.render();
    return true;
  }

  public addConsoleMessage(message: string, color: number): void {
    this.__addMessage(new Message(message, color));
  }

  public __addMessage(message: IMessage): void {
    this.__contents.push(message);
    // Keep only the last MAX_MESSAGE_COUNT messages.
    this.__contents = this.__contents.slice(-this.MAX_MESSAGE_COUNT);

    // If this channel is active, render immediately.
    if (window.gameClient.interface.channelManager.isActive(this)) {
      this.render();
      return;
    }
    // Otherwise, indicate a new message.
    this.blink();
  }

  public __getEmptyMessage(): string {
    return `<span class="channel-empty">No messages in channel ${this.name}.</span>`;
  }

  private __createElement(name: string): HTMLElement {
    // Create the container for the channel tab.
    const div = document.createElement("div");
    div.className = "channel-header";

    // Create the tab element.
    const tab = document.createElement("div");
    tab.draggable = true;
    tab.className = "chat-title";
    tab.innerHTML = `<span>${name}</span>`;
    tab.addEventListener("click", this.click.bind(this));

    div.appendChild(tab);

    // Append the tab to the header container.
    const cheader = document.getElementById("cheader");
    if (cheader) {
      cheader.appendChild(div);
    }

    return tab;
  }
}

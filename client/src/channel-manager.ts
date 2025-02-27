import Channel from "./channel";
import GameClient from "./gameclient";
import Interface from "./interface";
import LocalChannel from "./local-channel";
import CharacterMessage from "./message-character";
import PrivateChannel from "./private-channel";
import { ChannelJoinPacket, ChannelLeavePacket, ChannelMessagePacket, ChannelPrivatePacket } from "./protocol";

// Utility: If you need a clamp function on numbers, you can add one.
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default class ChannelManager {
  ;
  channels: Channel[];
  private __activeIndex: number;
  private __disabled: boolean;
  private __currentDragElement: HTMLElement | null;
  private __inputElement: HTMLInputElement;
  private __headerElement: HTMLElement;

  // Static constant for loudness settings.
  public static readonly LOUDNESS = {
    WHISPER: 0,
    SAY: 1,
    YELL: 2,
  };

  constructor() {
    
    this.channels = [];
    this.__activeIndex = 0;
    this.__disabled = true;
    this.__currentDragElement = null;

    // Assume these elements exist in the DOM.
    this.__inputElement = document.getElementById("chat-input") as HTMLInputElement;
    this.__headerElement = document.getElementById("cheader") as HTMLElement;

    // Always add these two channels.
    this.addChannel(0x00, "Default");
    this.addLocalChannel("Console");

    // Add listeners to left and right buttons for channel navigation.
    const leftChannel = document.getElementById("left-channel");
    if (leftChannel) {
      leftChannel.addEventListener("click", this.handleChannelIncrement.bind(this, -1));
    }
    const rightChannel = document.getElementById("right-channel");
    if (rightChannel) {
      rightChannel.addEventListener("click", this.handleChannelIncrement.bind(this, 1));
    }

    // Add listener to the send button.
    const sendChatMessage = document.getElementById("send-chat-message");
    if (sendChatMessage) {
      sendChatMessage.addEventListener("click", this.handleMessageSend.bind(this));
    }

    // Attach a listener to the header for handling channel drops.
    const cheader = document.getElementById("cheader");
    if (cheader) {
      cheader.addEventListener("dragover", this.__handleChannelDrop.bind(this));
    }

    // Focus on the main default channel.
    this.setActiveChannel(0);

    // Add listener for changing the chat loudness.
    const chatSayLoudness = document.getElementById("chat-say-loudness");
    if (chatSayLoudness) {
      chatSayLoudness.addEventListener("click", this.__changeLoudness);
    }
  }

  // Returns the current loudness based on the innerHTML of the chat-say-loudness element.
  getLoudness(): number {
    const loudnessElement = document.getElementById("chat-say-loudness");
    if (!loudnessElement) return ChannelManager.LOUDNESS.SAY; // Default to SAY.
    switch (loudnessElement.innerHTML) {
      case ")":
        return ChannelManager.LOUDNESS.WHISPER;
      case "))":
        return ChannelManager.LOUDNESS.SAY;
      case ")))":
        return ChannelManager.LOUDNESS.YELL;
      default:
        return ChannelManager.LOUDNESS.SAY;
    }
  }

  // Changes the loudness cycling through the available options.
  private __changeLoudness(event: Event): void {
    const target = event.currentTarget as HTMLElement;
    switch (target.innerHTML) {
      case ")":
        target.innerHTML = "))";
        break;
      case "))":
        target.innerHTML = ")))";
        break;
      case ")))":
        target.innerHTML = ")";
        break;
    }
  }

  isDisabled(): boolean {
    return this.__disabled;
  }

  // Toggles the chat input lock, updating the DOM accordingly.
  toggleInputLock(): void {
    this.__disabled = !this.__disabled;
    this.__inputElement.disabled = this.__disabled;
    if (this.__disabled) {
      this.__inputElement.placeholder = "Press Enter to unlock.";
      (document.activeElement as HTMLElement)?.blur();
    } else {
      this.__inputElement.placeholder = "Press Enter to lock.";
      this.__inputElement.focus();
    }
  }

  // Handles drop events in the channel header for reordering channels.
  private __handleChannelDrop(event: DragEvent): void {
    if (this.__currentDragElement === null) {
      return;
    }
    const element = event.target as HTMLElement;
    const cheader = document.getElementById("cheader");
    if (!cheader) return;
    if (element === cheader) {
      cheader.appendChild(this.__currentDragElement);
      return;
    }
    if (element.parentElement && element.parentElement.className === "channel-header") {
      cheader.insertBefore(this.__currentDragElement, element.parentElement);
    }
  }

  // Attaches drag event listeners to the channel's element.
  dragElement(elmnt: { element: HTMLElement }): void {
    elmnt.element.addEventListener("dragstart", this.__handleDragStart.bind(this));
    elmnt.element.addEventListener("dragend", this.__handleDragEnd.bind(this));
  }

  private __handleDragEnd(event: DragEvent): void {
    this.__currentDragElement = null;
    const target = event.target as HTMLElement;
    target.style.opacity = "1";
  }

  private __handleDragStart(event: DragEvent): void {
    const target = event.target as HTMLElement;
    this.__currentDragElement = target.parentElement;
    target.style.opacity = "0.25";
  }

  // Sends a join request to the server for a given channel.
  joinChannel(id: number, name: string): void {
    window.gameClient.send(new ChannelJoinPacket(id));
  }

  // Handles an open channel request.
  handleOpenChannel(channel: Channel): void {
    if (channel.id !== null) {
      this.addChannel(channel.id, channel.name);
    }
  }

  // Closes the currently active channel.
  closeCurrentChannel(): void {
    this.closeChannel(this.getActiveChannel());
  }

  // Closes a given channel. Prevents closing the default channel.
  closeChannel(channel: Channel): void {
    const index = this.channels.indexOf(channel);
    if (index === -1) {
      return;
    }
    if (channel.id === 0) {
      window.gameClient.interface.setCancelMessage("The Default channel cannot be closed.");
      return;
    }
    // Set the previous channel as the new active channel.
    this.setActiveChannel(Math.max(0, index - 1));
    this.channels.splice(index, 1);
    if (channel.element.parentNode) {
      channel.element.parentNode.removeChild(channel.element);
    }
    // For channels that are not private or local, inform the server.
    if (channel instanceof PrivateChannel || channel instanceof LocalChannel) {
      return;
    }

    if(channel.id)
      window.gameClient.send(new ChannelLeavePacket(channel.id));
  }

  // Increments or decrements the active channel by a given increment.
  handleChannelIncrement(increment: number): void {
    const newIndex = (this.channels.length + this.__activeIndex + increment) % this.channels.length;
    this.setActiveChannel(newIndex);
  }

  // Returns the currently active channel.
  getActiveChannel(): Channel {
    return this.channels[this.__activeIndex];
  }

  // Checks if the provided channel is currently active.
  isActive(channel: Channel): boolean {
    return this.getActiveChannel() === channel;
  }

  // If the current active channel has previous messages, suggest the last one.
  suggestPrevious(): void {
    const activeChannel = this.getActiveChannel();
    if (activeChannel.isEmpty()) {
      return;
    }
    this.__inputElement.value = activeChannel.lastMessageSelf() ?? "";
  }

  // Returns true if the chat input element is currently focused.
  isInputActive(): boolean {
    return this.__inputElement === document.activeElement;
  }

  // Adds a console message to the "Console" channel.
  addConsoleMessage(message: string, color: number): void {
    const consoleChannel = this.getChannel("Console");
    if (consoleChannel !== null) {
      consoleChannel.addConsoleMessage(message, color);
    }
  }

  // Searches for a channel by its ID.
  getChannelById(id: number): Channel | null {
    for (const channel of this.channels) {
      if (channel.id === id) {
        return channel;
      }
    }
    return null;
  }

  // Searches for a channel by its name.
  getChannel(name: string): Channel | null {
    for (const channel of this.channels) {
      if (channel.name === name) {
        return channel;
      }
    }
    return null;
  }

  // Adds a local channel.
  addLocalChannel(name: string): void {
    const existingChannel = this.getChannel(name);
    if (existingChannel !== null) {
      this.setActiveChannelElement(existingChannel);
      return;
    }
    this.__addChannel(new LocalChannel(name));
  }

  // Adds a private channel.
  addPrivateChannel(name: string): void {
    const existingChannel = this.getChannel(name);
    if (existingChannel !== null) {
      this.setActiveChannelElement(existingChannel);
      return;
    }
    if (window.gameClient && window.gameClient.player!.name === name) {
      window.gameClient.interface.setCancelMessage("Cannot open a chat window yourself.");
      return;
    }
    this.__addChannel(new PrivateChannel(name));
  }

  // Adds a public channel.
  addChannel(id: number, name: string): void {
    const existingChannel = this.getChannel(name);
    if (existingChannel !== null) {
      this.setActiveChannelElement(existingChannel);
      return;
    }
    this.__addChannel(new Channel(name, id));
  }

  // Internal method to add a channel to the collection and DOM.
  private __addChannel(channel: Channel): void {
    this.channels.push(channel);
    this.setActiveChannelElement(channel);
    this.dragElement(channel);
  }

  // Sets the active channel using a channel reference.
  setActiveChannelElement(channel: Channel): void {
    const index = this.channels.indexOf(channel);
    if (index === -1) return;
    this.setActiveChannel(index);
  }

  // Sets the header offset so the active channel is properly visible.
  setHeaderOffset(element: HTMLElement): void {
    const parent = element.parentElement?.parentElement;
    const selfParent = element.parentElement;
    if (parent && selfParent) {
      const parentOffset = parent.offsetLeft;
      const selfOffset = selfParent.offsetLeft;
      this.__headerElement.scrollLeft = selfOffset - parentOffset;
    }
  }

  // Handles sending a private message in a private channel.
  private __handlePrivateMessageSend(channel: Channel, message: string): void {
    channel.__addMessage(new CharacterMessage(message, 0, window.gameClient.player!.name, Interface.COLORS.MAYABLUE));
    window.gameClient.send(new ChannelPrivatePacket(channel.name, message));
  }

  // Reads the chat input and sends the message to the appropriate channel.
  handleMessageSend(): void {
    const message = this.__inputElement.value.trim();
    this.__inputElement.value = "";
    if (message.length === 0) return;
    const channel = this.getActiveChannel();
    if (channel instanceof LocalChannel) {
      window.gameClient.interface.setCancelMessage("Cannot write to a local channel.");
      return;
    }
    if (channel instanceof PrivateChannel) {
      this.__handlePrivateMessageSend(channel, message);
      return;
    }
    const loudness = this.getLoudness();
    if (channel.id !== null) {
      window.gameClient.send(new ChannelMessagePacket(channel.id, loudness, message));
    }
  }

  // Updates the active channel index.
  private __setActiveChannel(index: number): void {
    this.__activeIndex = index;
  }

  // Clears all messages from the currently active channel.
  clearCurrentChannel(): void {
    this.getActiveChannel().clear();
  }

  // Sets a new active channel by its index, updating DOM classes and header offset.
  setActiveChannel(index: number): void {
    // Reset the currently selected channel's class.
    this.getActiveChannel().element.className = "chat-title";
    this.__setActiveChannel(index);
    // Select the new active channel.
    this.getActiveChannel().select();
    // Adjust header scroll.
    this.setHeaderOffset(this.getActiveChannel().element);
  }
}

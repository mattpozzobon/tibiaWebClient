import { OfferBuyPacket } from "../../core/protocol";
import Item from "../../game/item";
import Position from "../../game/position";
import Canvas from "../../renderer/canvas";
import Modal from "./modal";


interface Offer {
  id: number;
  name: string;
  price: number;
  type: string;
  count: number
}

export default class OfferModal extends Modal {
  private __selectedElement: HTMLElement | null = null;
  private __selectedOffer: number | null = null;
  private __offerType: string = "sell";
  private __offers: Offer[] | null = null;
  private __id: number | string | null = null;

  constructor(id: string) {
    super(id);
    
    // Set up event listeners for offer type toggling and count changes.
    document.getElementById("set-sell")?.addEventListener("click", this.setOfferType.bind(this, "sell"));
    document.getElementById("set-buy")?.addEventListener("click", this.setOfferType.bind(this, "buy"));
    document.getElementById("buy-count")?.addEventListener("input", this.__handleChangeCount.bind(this));
  }

  private __handleChangeCount(event: Event): void {
    const input = event.target as HTMLInputElement;
    const offerCountElem = document.getElementById("offer-count");
    if (offerCountElem) {
      offerCountElem.innerHTML = input.value;
    }
    this.handleChangeCount();
  }

  public handleChangeCount(): void {
    if (this.__offers === null || this.__selectedOffer === null) return;
    const offer = this.__offers[this.__selectedOffer];
    const buyCountElem = document.getElementById("buy-count") as HTMLInputElement;
    let count = Number(buyCountElem.value);
    const wrapper = document.getElementById("buy-count-wrapper");
    if (wrapper && wrapper.style.display === "none") {
      count = 1;
    }
    const offerPriceElem = document.getElementById("offer-price");
    if (offerPriceElem) {
      offerPriceElem.innerHTML = String(count * offer.price);
    }
    const offerCountDisplay = document.getElementById("offer-count");
    if (offerCountDisplay) {
      offerCountDisplay.innerHTML = String(count);
    }
  }

  public setOfferType(which: string): void {
    // Update CSS classes for offer type tabs.
    const sellTab = document.getElementById("set-sell");
    const buyTab = document.getElementById("set-buy");
    if (sellTab) sellTab.className = "offer-tab";
    if (buyTab) buyTab.className = "offer-tab";
    const selectedTab = document.getElementById("set-" + which);
    if (selectedTab) {
      selectedTab.className += " selected";
    }
    // If already set, do nothing.
    if (this.__offerType === which) return;
    this.__offerType = which;
    this.setOffers();
  }

  public setOffers(): void {
    this.clear();
    const offerDOM = this.element.querySelector(".offers") as HTMLElement;
    if (!offerDOM) return;
    offerDOM.innerHTML = "";
    const filtered = this.__offers ? this.__offers.filter(this.matchOfferType.bind(this)) : [];
    if (filtered.length === 0) {
      offerDOM.innerHTML = "No " + this.__offerType + " offers to display.";
      return;
    }
    filtered
      .map((offer, index) => this.createOfferNode(offer, index))
      .forEach((node) => offerDOM.appendChild(node));
  }

  private matchOfferType(offer: Offer): boolean {
    return offer.type === this.__offerType;
  }

  public createOfferNode(offer: Offer, index: number): HTMLElement {
    const canvasInstance = new Canvas(null, 32, 32);
    canvasInstance.canvas.className = "slot";
    // Draw the item's sprite on the canvas. We assume Position.prototype.NULL is equivalent to a default position.
    canvasInstance.drawSprite(new Item(offer.id, offer.count), new Position(0, 0, 0), 32);
    canvasInstance.canvas.addEventListener("click", this.handleSelectOffer.bind(this, canvasInstance, offer, index));
    return canvasInstance.canvas;
  }

  public clear(): void {
    const offerNameElem = document.getElementById("offer-name");
    if (offerNameElem) {
      offerNameElem.innerHTML = "Select an Offer";
    }
    this.__selectedElement = null;
    this.__selectedOffer = null;
  }

  public handleSelectOffer(canvasInstance: Canvas, offer: Offer, index: number): void {
    if (this.__selectedElement !== null) {
      this.__selectedElement.className = "slot";
    }
    this.__selectedElement = canvasInstance.canvas;
    this.__selectedOffer = index;
    canvasInstance.canvas.className = "slot selected";
    this.__setOfferInformation(offer);
    this.handleChangeCount();
  }

  public handleOpen = (properties: any): void => {
    // Retrieve the NPC from the game world.
    const NPC = window.gameClient.world.getCreature(properties.id);
    this.__id = properties.id;
    this.__offers = properties.offers;
    this.setOffers();
    this.setTitle(`${NPC.name} Trade Offers`);
    const wrapper = document.getElementById("buy-count-wrapper");
    if (wrapper) {
      wrapper.style.display = "none";
    }
  }

  public handleConfirm = (): boolean => {
    if (this.__selectedOffer === null) {
      return false;
    }
    let count = Number((document.getElementById("buy-count") as HTMLInputElement).value);
    const wrapper = document.getElementById("buy-count-wrapper");
    if (wrapper && wrapper.style.display === "none") {
      count = 1;
    }
    if (typeof this.__id === 'number') {
      window.gameClient.send(new OfferBuyPacket(this.__id, this.__selectedOffer, count));
    } else {
      console.error('Invalid ID type');
    }
    return false;
  }

  private __setOfferInformation(offer: Offer): void {
    const thing = new Item(offer.id, offer.count);
    const wrapper = document.getElementById("buy-count-wrapper");
    if (wrapper) {
      wrapper.style.display = thing.isStackable() ? "flex" : "none";
    }
    const offerNameElem = document.getElementById("offer-name");
    if (offerNameElem) {
      offerNameElem.innerHTML = offer.name;
    }
    const offerPriceElem = document.getElementById("offer-price");
    if (offerPriceElem) {
      offerPriceElem.innerHTML = String(offer.price);
    }
  }

  // Optionally, you can implement __setPriceInformation if needed.
  private __setPriceInformation(offer: Offer): void {
    // Implementation not provided.
  }
}

import EventEmitter from "./eventemitter";
import State from "./state";


export default class InteractiveWindow extends EventEmitter {
    __element: HTMLElement;
    state: State;
  
    static readonly MINIMUM_HEIGHT = 76;
    static readonly HIDDEN_HEIGHT = 20;
  
    constructor(element: HTMLElement) {
      super();
      /*
       * Class InteractiveWindow
       * Makes an element with the window class interactive
       */
  
      this.__element = element;
  
      // Make the interactive element draggable
      element.draggable = true;
  
      // Attach listeners to the header buttons
      Array.from(this.getElement(".header").getElementsByTagName("button")).forEach((buttonElement) => {
        buttonElement.addEventListener("click", this.handleButtonClick.bind(this));
      });
  
      // State for the window
      this.state = new State();
      this.state.add("title", this.__setTitle.bind(this));
    }
  
    private __setTitle(title: string): void {
      /*
       * Function InteractiveWindow.__setTitle
       * Sets the title of the window
       */
      const titleElement = this.getElement(".header .title") as HTMLElement;
      titleElement.innerHTML = title.charAt(0).toUpperCase() + title.slice(1);
    }
  
    getBody(): HTMLElement {
      /*
       * Function InteractiveWindow.getBody
       * Returns the body element of the window
       */
      return this.getElement(".body") as HTMLElement;
    }
  
    isMinimized(): boolean {
      /*
       * Function InteractiveWindow.isMinimized
       * Returns true when the configured window is hidden
       */
      return this.getBody().style.display === "none";
    }
  
    getElement(selector: string): HTMLElement {
      /*
       * Function InteractiveWindow.getElement
       * Returns an element inside the interactive window
       */
      return this.__element.querySelector(selector) as HTMLElement;
    }
  
    private handleButtonClick(event: Event): void {
      /*
       * Function InteractiveWindow.handleButtonClick
       * Delegates a click on a button in the header
       */
      const target = event.target as HTMLElement;
      const action = target.getAttribute("action");
  
      if (!action) return;
  
      this.emit(action);
  
      switch (action) {
        case "minimize":
          this.minimize(target);
          break;
        case "close":
          this.close();
          break;
      }
    }
  
    private minimize(buttonElement: HTMLElement): void {
      /*
       * Function InteractiveWindow.minimize
       * Minimizes or restores the window
       */
      if (this.isMinimized()) {
        this.setElementVisible(buttonElement);
      } else {
        this.setElementHidden(buttonElement);
      }
    }
  
    private setElementVisible(buttonElement: HTMLElement): void {
      /*
       * Function InteractiveWindow.setElementVisible
       * Restores the window to its original height
       */
      const body = this.getBody();
      const footer = this.getElement(".footer");
  
      body.style.display = "flex";
      body.style.height = "40px";
      this.__element.style.minHeight = "82px";
      footer.style.display = "block";
  
      buttonElement.innerHTML = "&#x2212;";
    }
  
    private setElementHidden(buttonElement: HTMLElement): void {
      /*
       * Function InteractiveWindow.setElementHidden
       * Minimizes the window by hiding its content
       */
      const body = this.getBody();
      const footer = this.getElement(".footer");
  
      body.style.display = "none";
      footer.style.display = "none";
      this.__element.style.minHeight = InteractiveWindow.HIDDEN_HEIGHT + "px";
      buttonElement.innerHTML = "+";
    }
  
    toggle(): void {
      /*
       * Function InteractiveWindow.toggle
       * Toggles the window open or closed
       */
      this.__element.style.display = this.isHidden() ? "flex" : "none";
    }
  
    close(): void {
      /*
       * Function InteractiveWindow.close
       * Closes the window
       */
      this.__element.style.display = "none";
    }
  
    isHidden(): boolean {
      /*
       * Function InteractiveWindow.isHidden
       * Returns true if the window is hidden
       */
      return this.__element.style.display === "none" || this.__element.style.display === "";
    }
  
    open(): void {
      /*
       * Function InteractiveWindow.open
       * Opens the window
       */
      this.__element.style.display = "flex";
    }
  
    setContent(content: Node[] | null): void {
      /*
       * Function InteractiveWindow.setContent
       * Sets the content of the window
       */
      const body = this.getBody();
  
      // Reset content
      body.innerHTML = "";
  
      if (!content) {
        return;
      }
  
      // Add all the child nodes
      content.filter(Boolean).forEach((node) => {
        body.appendChild(node);
      });
    }
  
    remove(): void {
      /*
       * Function InteractiveWindow.remove
       * Removes the element from the DOM
       */
      this.__element.remove();
    }
  
    addTo(stackElement: HTMLElement): void {
      /*
       * Function InteractiveWindow.addTo
       * Adds an interactive window to a particular stack
       */
      //stackElement.appendChild(this.__element);
    }
  }
  
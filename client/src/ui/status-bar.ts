// These declarations are for demonstration.
// In your project, replace them with the actual types or imports.
declare const gameClient: any;
declare const ConditionManager: any;

export default class StatusBar {
  public statusBarElement: HTMLElement;
  public STATUS: Map<number, { title: string; src: string }>;

  constructor() {
    const elem = document.getElementById("status-bar");
    if (!elem) {
      throw new Error("Status bar element not found");
    }
    this.statusBarElement = elem;

    // Initialize the status map.
    this.STATUS = new Map();
    this.STATUS.set(0, { title: "You are drunk.", src: "/png/status/status-drunk.png" });
    this.STATUS.set(1, { title: "You are poisoned.", src: "/png/status/status-poisoned.png" });
    this.STATUS.set(2, { title: "You are burning.", src: "/png/status/status-burning.png" });
    this.STATUS.set(3, { title: "You are electrified.", src: "/png/status/status-electrified.png" });
    this.STATUS.set(4, { title: "You are invisible.", src: "/png/status/status-invisible.png" });
    this.STATUS.set(5, { title: "You are in a protection zone.", src: "/png/status/status-protection-zone.png" });
    this.STATUS.set(6, { title: "You were recently in combat.", src: "/png/status/status-combat.png" });
    this.STATUS.set(12, { title: "You are wearing a magic shield.", src: "/png/status/status-magic-shield.png" });
    this.STATUS.set(14, { title: "You are hungry.", src: "/png/status/status-hungry.png" });
    this.STATUS.set(15, { title: "You are hasted.", src: "/png/status/status-haste.png" });
  }

  public update(): void {
    // Create nodes from the current conditions.
    // Conditions not found in the STATUS map are skipped.
    // Also, if the player does NOT have the "SATED" condition, add the "SATED" node (interpreted as hungry).
    const conditions = Array.from(gameClient.player.conditions.__conditions) as number[];
    const conditionNodes: HTMLElement[] = conditions
      .filter(cid => this.STATUS.has(cid) && cid !== ConditionManager.prototype.SATED)
      .map(this.__createConditionNode, this);

    if (!gameClient.player.hasCondition(ConditionManager.prototype.SATED)) {
      conditionNodes.push(this.__createConditionNode(ConditionManager.prototype.SATED));
    }

    this.statusBarElement.replaceChildren(...conditionNodes);
  }

  private __createConditionNode(cid: number): HTMLElement {
    const condition = this.STATUS.get(cid);
    if (!condition) {
      throw new Error(`Condition ${cid} not found in STATUS map`);
    }
    const img = document.createElement("img");
    img.src = condition.src;
    img.title = condition.title;
    return img;
  }
}

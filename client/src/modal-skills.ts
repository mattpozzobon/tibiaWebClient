import Modal from "./modal";

function formatNumber(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default class SkillModal extends Modal {
  constructor(id: string) {
    super(id);
  }

  public setSkillValue(which: string, value: number, percentage: number): void {
    const spanSelector = `div[skill="${which}"]`;
    const container = this.getElement(spanSelector);
    if (!container) return;

    // Find the element with class "skill" inside the container.
    const skillElement = container.querySelector(".skill") as HTMLElement | null;
    if (skillElement) {
      skillElement.innerHTML = formatNumber(value);
      // Alternatively: skillElement.innerHTML = value.toLocaleString();
    }

    // Find the element with class "bar" inside the container.
    const barElement = container.querySelector(".bar") as HTMLElement | null;
    if (!barElement) return;

    barElement.title = `You need ${Math.ceil(100 - percentage)}% to advance.`;

    if (barElement.children.length > 0) {
      (barElement.children[0] as HTMLElement).style.width = `${percentage}%`;
    }
  }

  public setCharactherInfo(data: any): void {
    const nameElement = document.getElementById("character-name");
    if (nameElement) {
      nameElement.innerText = "Name: " + data.name;
    }
  }


}

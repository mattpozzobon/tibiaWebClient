export default class SoundBit {
    ids: string[];
  
    constructor(ids: string[]) {
      this.ids = ids;
    }
  
    public play(): void {
      const randomIndex = Math.floor(Math.random() * this.ids.length);
      const id = this.ids[randomIndex];
      const element = document.getElementById(id) as HTMLAudioElement | null;
      if (!element) return;
      const clone = element.cloneNode(true) as HTMLAudioElement;
      clone.volume = 0.5;
      clone.play();
    }
  }
  
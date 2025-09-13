import SoundBit from "./soundbit";
import SoundTrace from "./soundtrace";

export default class SoundManager {
  
  public traces: Record<string, SoundTrace>;
  public soundbits: Record<string, SoundBit>;
  public ambientTraces: Record<string, SoundTrace>;
  private __masterVolume: number;
  private __currentAmbientTrace: SoundTrace | null;

  constructor(enabled: boolean) {
    
    this.traces = {};
    this.soundbits = {};
    this.ambientTraces = {};

    // Sound system DOM manipulation disabled - React handles audio

    // Master volume for all traces
    this.__masterVolume = enabled ? 1.0 : 0.0;
    this.__currentAmbientTrace = null;
  }

  public playWalkBit(position: any): void {
    const tile = window.gameClient.world.getTileFromWorldPosition(position);
    if (tile?.id === 405) {
      this.play("wood");
    } else {
      this.play("grass-walk");
    }
  }

  public enableSound(bool: boolean): void {
    this.setMasterVolume(bool ? 1.0 : 0.0);
  }

  public setMasterVolume(amount: number): void {
    if (!window.gameClient.interface.settings.isSoundEnabled()) {
      amount = 0;
    }
    this.__masterVolume = amount;
    if (this.__currentAmbientTrace) {
      this.__currentAmbientTrace.setVolume(amount);
    }
  }

  public registerSoundbit(id: string, ids: string[]): void {
    this.soundbits[id] = new SoundBit(ids);
  }

  public registerAmbientTrace(id: string): void {
    this.ambientTraces[id] = new SoundTrace(id);
  }

  public registerTrace(id: string): void {
    this.traces[id] = new SoundTrace(id);
  }

  public tick(): void {
    // Tick each sound trace to update its state.
    Object.values(this.traces).forEach(trace => trace.tick());
    Object.values(this.ambientTraces).forEach(trace => trace.tick());
  }

  public fadeTo(trackOne: string, trackTwo: string): void {
    // Swap volumes between two ambient traces.
    this.setVolume(trackOne, 0);
    this.setVolume(trackTwo, 1);
  }

  public play(id: string): void {
    if (!this.soundbits.hasOwnProperty(id)) {
      return;
    }
    this.soundbits[id].play();
  }

  public setAmbientTrace(id: string): void {
    if (this.__currentAmbientTrace !== null) {
      this.__currentAmbientTrace.setVolume(0);
    }
    this.__currentAmbientTrace = this.setAmbientVolume(id, 1);
  }

  public setAmbientVolume(id: string, volume: number): SoundTrace | null {
    if (!this.ambientTraces.hasOwnProperty(id)) {
      return null;
    }
    return this.ambientTraces[id].setVolume(volume);
  }

  public setVolume(id: string, volume: number): SoundTrace | null {
    if (!this.traces.hasOwnProperty(id)) {
      return null;
    }
    return this.traces[id].setVolume(volume);
  }
}

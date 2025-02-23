import GameClient from "./gameclient";

export default class Debugger {
  private gameClient: GameClient;
  private __showStatistics: boolean;
  __nFrames: number;
  private __averageFPS: number;
  private __averageEvictions: number;
  private __averageDrawCalls: number;
  private __averageDrawTime: number;
  private __nSeconds: number;
  private __GPU: string;

  // How often the statistics are updated (in frames).
  public readonly UPDATE_INTERVAL: number = 60;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    // Debugger state.
    this.__showStatistics = false;
    this.__nFrames = 0;
    this.__averageFPS = 0;
    this.__averageEvictions = 0;
    this.__averageDrawCalls = 0;
    this.__averageDrawTime = 0;
    this.__nSeconds = performance.now();

    // Information on the GPU.
    this.__GPU = this.__getGPUInformation();
  }

  public isActive(): boolean {
    // Returns true if the debugger is active.
    return this.__showStatistics;
  }

  public renderStatistics(): void {
    // Render statistics to the top of the screen.
    if (!this.isActive()) {
      return;
    }
    if (!this.__shouldUpdate()) {
      return;
    }
    this.__renderStatistics();
  }

  public toggleStatistics(): void {
    // Toggles visibility of debugging statistics on/off.
    this.__showStatistics = !this.__showStatistics;
    const debugEl = document.getElementById("debug-statistics");
    if (!this.isActive()) {
      if (debugEl) {
        debugEl.innerHTML = "";
      }
    } else {
      this.__renderStatistics();
    }
  }

  private __getGPUInformation(): string {
    // Returns the GPU information if available.
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      return gl.getParameter(gl.RENDERER);
    }
    return "Unknown GPU";
  }

  private __updateAverageStatistics(): void {
    // Time elapsed since the previous update.
    const elapsed = performance.now() - this.__nSeconds;

    // Calculate average statistics over the interval.
    this.__averageEvictions = parseFloat(((1E3 * this.gameClient.spriteBuffer.nEvictions) / elapsed).toFixed(0));
    this.__averageFPS = parseFloat(((1E3 * this.UPDATE_INTERVAL) / elapsed).toFixed(0));
    this.__averageDrawCalls = parseFloat((this.gameClient.renderer.drawCalls / this.UPDATE_INTERVAL).toFixed(0));
    this.__averageDrawTime = parseFloat(((1E3 * this.gameClient.renderer.totalDrawTime) / this.UPDATE_INTERVAL).toFixed(0));

    this.__nSeconds = performance.now();

    this.gameClient.networkManager.getLatency();

    // Reset counters.
    this.gameClient.renderer.drawCalls = 0;
    this.gameClient.spriteBuffer.nEvictions = 0;
    this.gameClient.renderer.totalDrawTime = 0;
  }

  private __shouldUpdate(): boolean {
    // Returns true if the debugger should update on this frame.
    return this.__nFrames % this.UPDATE_INTERVAL === 0;
  }

  private __getMemoryUsage(): string {
    try {
      const mem = (performance as any).memory;
      if (mem && mem.totalJSHeapSize) {
        return (1E-6 * mem.totalJSHeapSize).toFixed(0) + "MB";
      } else {
        return "Metric Not Available";
      }
    } catch (exception) {
      return "Metric Not Available";
    }
  }

  private __renderStatistics(): void {
    // Update the average statistics.
    this.__updateAverageStatistics();

    // Build the debug information string.
    const debugInfo = [
      `Server Version: ${this.gameClient.serverVersion}`,
      `Client Version: ${this.gameClient.clientVersion}`,
      `Server Tick Interval: ${this.gameClient.getTickInterval()}ms`,
      `Current Frame: ${this.gameClient.eventQueue.getFrame()}`,
      `Frame Rate: ${this.__averageFPS}fps`,
      `Draw Calls: ${this.__averageDrawCalls}`,
      `Draw Time: ${this.__averageDrawTime}µs`,
      `Draw Tiles: ${this.gameClient.renderer.numberOfTiles}`,
      `Active Entities: ${Object.keys(this.gameClient.world.activeCreatures).length}`,
      `Latency: ${Math.round(this.gameClient.networkManager.state.latency)}ms`,
      `Packets Received: ${this.gameClient.networkManager.state.nPackets}`,
      `Packets Sent: ${this.gameClient.networkManager.nPacketsSent}`,
      `Bytes Recieved: ${Math.round(1E-3 * this.gameClient.networkManager.state.bytesRecv)}KB`,
      `Bytes Sent: ${Math.round(1E-3 * this.gameClient.networkManager.state.bytesSent)}KB`,
      `Sprite Buffer Size: ${Math.round(1E-6 * this.gameClient.spriteBuffer.size * this.gameClient.spriteBuffer.size * 4 * 32 * 32)}MB`,
      `Sprite Buffer Evictions: ${this.__averageEvictions}`,
      `Memory Usage: ${this.__getMemoryUsage()}`,
      `GPU: ${this.__GPU}`,
      `Identifier: ${this.gameClient.player!.id}`,
      `Current Position: ${this.gameClient.player!.getPosition().toString()}`,
      `Current Chunk: ${this.gameClient.player!.getChunk().id}`,
      `Opened Containers: ${this.gameClient.player!.__openedContainers.size}`,
      `Outfit: ${this.gameClient.player!.outfit.toString()}`
    ].join("<br>");

    const debugEl = document.getElementById("debug-statistics");
    if (debugEl) {
      debugEl.innerHTML = debugInfo;
    }
  }
}

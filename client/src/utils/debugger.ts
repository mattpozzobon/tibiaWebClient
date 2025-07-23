export default class Debugger {
 
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

  constructor() {
    
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
    this.__averageEvictions = parseFloat(((1E3 * window.gameClient.spriteBuffer.nEvictions) / elapsed).toFixed(0));
    this.__averageFPS = parseFloat(((1E3 * this.UPDATE_INTERVAL) / elapsed).toFixed(0));
    //this.__averageDrawCalls = parseFloat((window.gameClient.renderer.drawCalls / this.UPDATE_INTERVAL).toFixed(0));
    this.__averageDrawTime = parseFloat(((1E3 * window.gameClient.renderer.__totalDrawTime) / this.UPDATE_INTERVAL).toFixed(0));

    this.__nSeconds = performance.now();

    window.gameClient.networkManager.getLatency();

    // Reset counters.
    //window.gameClient.renderer.drawCalls = 0;
    window.gameClient.spriteBuffer.nEvictions = 0;
    window.gameClient.renderer.__totalDrawTime = 0;
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
      `Server Version: ${window.gameClient.serverVersion}`,
      `Client Version: ${window.gameClient.clientVersion}`,
      // `Tile Pool Size: ${window.gameClient.renderer.tileRenderer.getPoolStats().total}`,
      // `Tile Pool Used: ${window.gameClient.renderer.tileRenderer.getPoolStats().used}`,
      // `Tile Pool Available: ${window.gameClient.renderer.tileRenderer.getPoolStats().available}`,
      `Server Tick Interval: ${window.gameClient.getTickInterval()}ms`,
      `Latency: ${Math.round(window.gameClient.networkManager.state.latency)}ms`,
      `Packets Received: ${window.gameClient.networkManager.state.nPackets}`,
      `Packets Sent: ${window.gameClient.networkManager.nPacketsSent}`,
      `Bytes Recieved: ${Math.round(1E-3 * window.gameClient.networkManager.state.bytesRecv)}KB`,
      `Bytes Sent: ${Math.round(1E-3 * window.gameClient.networkManager.state.bytesSent)}KB`,
      '--------------------------------',
      `Current Frame: ${window.gameClient.eventQueue.getFrame()}`,
      `Frame Rate: ${this.__averageFPS}fps`,
      `Draw Calls: ${this.__averageDrawCalls}`,
      `Draw Time: ${this.__averageDrawTime}µs`,
      //`Draw Tiles: ${window.gameClient.renderer.tileRenderer.numberOfTiles}`,
      `Active Entities: ${Object.keys(window.gameClient.world.activeCreatures).length}`,
      `Sprite Buffer Hit: ${window.gameClient.spriteBuffer.hitCount}`,
      `Sprite Buffer Miss: ${window.gameClient.spriteBuffer.missCount}`,
      `Sprite Buffer Decode: ${window.gameClient.spriteBuffer.decodeCount}`,
      `Sprite Buffer Evictions: ${window.gameClient.spriteBuffer.nEvictions}`,
      `Sprite Buffer Atlas Fill: ${window.gameClient.spriteBuffer.getAtlasFillInfo()}`,
      '--------------------------------',
      //`Sprite Buffer Size: ${Math.round(1E-6 * window.gameClient.spriteBuffer.size * window.gameClient.spriteBuffer.size * 4 * 32 * 32)}MB`,
      `Sprite Buffer Evictions: ${this.__averageEvictions}`,
      `Memory Usage: ${this.__getMemoryUsage()}`, 
      `GPU: ${this.__GPU}`,
      `Identifier: ${window.gameClient.player!.id}`,
      `Current Position: ${window.gameClient.player!.getPosition().toString()}`,
      `Current Chunk: ${window.gameClient.player!.getChunk().id}`,
      `Opened Containers: ${window.gameClient.player!.__openedContainers.size}`,
      `Outfit: ${window.gameClient.player!.outfit.toString()}`
    ].join("<br>");

    const debugEl = document.getElementById("debug-statistics");
    if (debugEl) {
      debugEl.innerHTML = debugInfo;
    }
  }
}

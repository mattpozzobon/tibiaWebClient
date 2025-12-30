// utils/debugger.ts
export default class Debugger {
  private __showStatistics: boolean;
  __nFrames: number;
  private __averageFPS: number;
  private __averageEvictions: number;

  // Sum of assemble+render (CPU) for display
  private __averageDrawTime: number;

  // Separate averages (microseconds)
  private __averageAssembleUs: number = 0;
  private __averageRenderUs: number = 0;

  private __nSeconds: number;
  private __GPU: string;

  // How often the statistics are updated (in frames).
  public readonly UPDATE_INTERVAL: number = 60;

  constructor() {
    this.__showStatistics = false;
    this.__nFrames = 0;
    this.__averageFPS = 0;
    this.__averageEvictions = 0;
    this.__averageDrawTime = 0;
    this.__nSeconds = performance.now();
    this.__GPU = this.__getGPUInformation();
  }

  public isActive(): boolean {
    return this.__showStatistics;
  }

  public renderStatistics(): void {
    if (!this.isActive()) return;
    if (!this.__shouldUpdate()) return;
    this.__renderStatistics();
  }

  public toggleStatistics(): void {
    this.__showStatistics = !this.__showStatistics;
    const debugEl = document.getElementById("debug-statistics");
    if (!this.isActive()) {
      if (debugEl) debugEl.innerHTML = "";
    } else {
      this.__renderStatistics();
    }
  }

  private __getGPUInformation(): string {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) return gl.getParameter(gl.RENDERER);
    return "Unknown GPU";
  }

  private __updateAverageStatistics(): void {
    const elapsed = performance.now() - this.__nSeconds;

    // FPS
    this.__averageFPS = Math.round((1000 * this.UPDATE_INTERVAL) / elapsed);

    // per-interval renderer CPU accumulators
    const r = window.gameClient.renderer;

    // µs averages over UPDATE_INTERVAL frames
    this.__averageAssembleUs = Math.round((1e3 * r.totalAssembleMs) / this.UPDATE_INTERVAL);
    this.__averageRenderUs   = Math.round((1e3 * r.totalRenderMs)   / this.UPDATE_INTERVAL);

    // combined CPU time per frame (assemble + render)
    this.__averageDrawTime = this.__averageAssembleUs + this.__averageRenderUs;

    this.__nSeconds = performance.now();

    window.gameClient.networkManager.getLatency();

    // reset per-interval accumulators
    window.gameClient.spriteBuffer.nEvictions = 0;
    r.totalAssembleMs = 0;
    r.totalRenderMs = 0;
  }

  private __shouldUpdate(): boolean {
    return this.__nFrames % this.UPDATE_INTERVAL === 0;
  }

  private __getMemoryUsage(): string {
    try {
      const mem = (performance as any).memory;
      if (mem && mem.totalJSHeapSize) {
        return (1e-6 * mem.totalJSHeapSize).toFixed(0) + "MB";
      } else {
        return "Metric Not Available";
      }
    } catch {
      return "Metric Not Available";
    }
  }

  private __renderStatistics(): void {
    this.__updateAverageStatistics();

    const r = window.gameClient.renderer;
    const worldTime = window.gameClient.world.clock.getTimeString();

    const debugInfo = [
      `World Time: ${worldTime}`,
      '--------------------------------',
      `Server Version: ${window.gameClient.serverVersion}`,
      `Client Version: ${window.gameClient.clientVersion}`,
      `Server Tick Interval: ${window.gameClient.getTickInterval()}ms`,
      `Latency: ${Math.round(window.gameClient.networkManager.state.latency)}ms`,
      `Packets Received: ${window.gameClient.networkManager.state.nPackets}`,
      `Packets Sent: ${window.gameClient.networkManager.nPacketsSent}`,
      `Bytes Recieved: ${Math.round(1e-3 * window.gameClient.networkManager.state.bytesRecv)}KB`,
      `Bytes Sent: ${Math.round(1e-3 * window.gameClient.networkManager.state.bytesSent)}KB`,
      '--------------------------------',
      `Current Frame: ${window.gameClient.eventQueue.getFrame()}`,
      `Frame Rate: ${this.__averageFPS}fps`,
      `Frame CPU avg: ${this.__averageDrawTime}µs`,
      `Assemble (CPU) avg: ${this.__averageAssembleUs}µs`,
      `Render   (CPU) avg: ${this.__averageRenderUs}µs`,
      `Assemble (CPU) last: ${Math.round(1e3 * r.cpuAssembleMs)}µs`,
      `Render   (CPU) last: ${Math.round(1e3 * r.cpuRenderMs)}µs`,
      `Draw Calls: ${r.drawCalls}`,
      `Batches: ${r.batchCount}`,
      `Texture Switches: ${r.textureSwitches}`,
      `Active Entities: ${Object.keys(window.gameClient.world.activeCreatures).length}`,
      `Sprite Buffer Hit: ${window.gameClient.spriteBuffer.hitCount}`,
      `Sprite Buffer Miss: ${window.gameClient.spriteBuffer.missCount}`,
      `Sprite Buffer Decode: ${window.gameClient.spriteBuffer.decodeCount}`,
      `Sprite Buffer Evictions: ${window.gameClient.spriteBuffer.nEvictions}`,
      `Sprite Buffer Atlas Fill: ${window.gameClient.spriteBuffer.getAtlasFillInfo()}`,
      `Sprite Pool Usage: ${r.poolIndex}/${r.poolSize}`,
      '--------------------------------',
      `Memory Usage: ${this.__getMemoryUsage()}`,
      `GPU: ${this.__GPU}`,
      `Identifier: ${window.gameClient.player!.id}`,
      `Current Position: ${window.gameClient.player!.getPosition().toString()}`,
      `Current Chunk: ${window.gameClient.player!.getChunk().id}`,
      `Opened Containers: ${window.gameClient.player!.containers.getContainerCount()}`,
      `Outfit: ${window.gameClient.player!.outfit.toIdAndDetailsString()}`,
      `Outfit: ${window.gameClient.player!.outfit.toEquipmentString()}`,
    ].join("<br>");

    const debugEl = document.getElementById("debug-statistics");
    if (debugEl) debugEl.innerHTML = debugInfo;
  }
}

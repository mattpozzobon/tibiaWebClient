// client/src/react/components/login/AssetDownload.tsx
import React, { useEffect, useRef, useState } from "react";
import type GameClient from "../../../core/gameclient";
import SpriteBuffer from "../../../renderer/sprite-buffer";
import "./styles/AssetDownload.scss";

// Build-time injected (see webpack DefinePlugin)
declare const __CDN_BASE__: string | undefined;

interface AssetDownloadProps {
  gc: GameClient | null | undefined;
  onDownloadComplete: () => void;
}

type UIState = {
  progress: number;
  status: string;
  isComplete: boolean;
  currentFile: string;
  error?: string | null;
};

type GameAsset = { url: string; filename: string };
type Progress = { loaded: number; total?: number };

const CDN_BASE =
  (typeof __CDN_BASE__ !== "undefined" && __CDN_BASE__) ||
  (import.meta as any)?.env?.VITE_ASSET_BASE_URL ||
  "";

const ASSETS: GameAsset[] = [
  { url: `${CDN_BASE}/sprites/Tibia.spr`, filename: "Tibia.spr" },
  { url: `${CDN_BASE}/sprites/Tibia.dat`, filename: "Tibia.dat" },
];

const LANES = 8;
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

async function headForMeta(url: string) {
  const r = await fetch(url, { method: "HEAD" });
  if (!r.ok) throw new Error(`HEAD ${r.status} ${r.statusText}`);
  const len = Number(r.headers.get("content-length") || 0);
  const ranges = (r.headers.get("accept-ranges") || "").toLowerCase().includes("bytes");
  return { len, ranges };
}

async function fetchRange(url: string, start: number, end: number) {
  const r = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });
  if (!(r.status === 206 || r.status === 200)) {
    throw new Error(`Range fetch failed: ${r.status}`);
  }
  return await r.arrayBuffer();
}

// Streaming fallback for when HEAD/ranges aren’t available
async function streamDownload(
  url: string,
  onProgress: (loaded: number, total?: number) => void
) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

  const total = Number(resp.headers.get("content-length") || 0) || undefined;
  const reader = resp.body?.getReader();

  // No stream support → single shot
  if (!reader) {
    const buf = await resp.arrayBuffer();
    onProgress(buf.byteLength, total ?? buf.byteLength);
    return buf;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress(loaded, total);
    }
  }

  const out = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  onProgress(loaded, total ?? loaded);
  return out.buffer;
}

async function rangedDownload(
  url: string,
  onProgress: (loaded: number, total?: number) => void
) {
  let len = 0;
  let ranges = false;

  try {
    const meta = await headForMeta(url);
    len = meta.len;
    ranges = meta.ranges;
  } catch {
    // HEAD may be blocked or stripped by CDN; fall back to streaming
  }

  if (!len || !ranges) {
    // Streamed GET with incremental progress
    return await streamDownload(url, onProgress);
  }

  const target = new Uint8Array(len);
  const nChunks = Math.ceil(len / CHUNK_SIZE);
  let nextChunk = 0;
  let loaded = 0;
  let lastTick = 0;

  const writeChunk = (start: number, data: ArrayBuffer) => {
    target.set(new Uint8Array(data), start);
    loaded += data.byteLength;
    const now = performance.now();
    if (now - lastTick > 100) {
      lastTick = now;
      onProgress(loaded, len);
    }
  };

  const worker = async () => {
    while (true) {
      const idx = nextChunk++;
      if (idx >= nChunks) return;
      const start = idx * CHUNK_SIZE;
      const end = Math.min(len - 1, start + CHUNK_SIZE - 1);
      const buf = await fetchRange(url, start, end);
      writeChunk(start, buf);
    }
  };

  await Promise.all(new Array(LANES).fill(0).map(worker));
  onProgress(len, len);
  return target.buffer;
}

class AssetLoader {
  private inFlight = new Map<
    string,
    { promise: Promise<ArrayBuffer>; progress: Progress; listeners: Set<(p: Progress) => void> }
  >();

  private notify(filename: string) {
    const row = this.inFlight.get(filename);
    if (!row) return;
    const snap = { ...row.progress };
    row.listeners.forEach((l) => l(snap));
  }

  onProgress(filename: string, fn: (p: Progress) => void) {
    const row = this.inFlight.get(filename);
    if (!row) return () => {};
    row.listeners.add(fn);
    fn({ ...row.progress });
    return () => row.listeners.delete(fn);
  }

  fetchOnce(url: string, filename: string): Promise<ArrayBuffer> {
    const existing = this.inFlight.get(filename);
    if (existing) return existing.promise;

    const progress: Progress = { loaded: 0, total: undefined };
    const listeners = new Set<(p: Progress) => void>();

    // Batch listener updates on rAF (prevents React state thrash)
    let rafId: number | null = null;
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        this.notify(filename);
      });
    };

    const promise = (async () => {
      const buf = await rangedDownload(url, (loaded, total) => {
        progress.loaded = loaded;
        progress.total = total;
        schedule();
      });
      // Final notify
      progress.loaded = progress.total ?? progress.loaded;
      schedule();
      return buf;
    })();

    this.inFlight.set(filename, { promise, progress, listeners });
    promise.catch(() => this.inFlight.delete(filename));
    return promise;
  }

  async fetchAllSequential(
    assets: GameAsset[],
    onAnyProgress: (name: string, p: Progress) => void
  ) {
    const out = new Map<string, ArrayBuffer>();
    for (const a of assets) {
      this.fetchOnce(a.url, a.filename);
      const off = this.onProgress(a.filename, (p) => onAnyProgress(a.filename, p));
      const buf = await this.fetchOnce(a.url, a.filename);
      off();
      out.set(a.filename, buf);
    }
    return out;
  }
}

const loader = new AssetLoader();

async function processDownloaded(gc: GameClient, buffers: Map<string, ArrayBuffer>) {
  const dat = buffers.get("Tibia.dat");
  const spr = buffers.get("Tibia.spr");
  if (!dat || !spr) throw new Error("Missing required game assets");
  gc.dataObjects.load("Tibia.dat", { target: { result: dat } } as unknown as ProgressEvent<FileReader>);
  SpriteBuffer.load("Tibia.spr", { target: { result: spr } } as unknown as ProgressEvent<FileReader>);
}

export default function AssetDownload({ gc, onDownloadComplete }: AssetDownloadProps) {
  const [ui, setUi] = useState<UIState>({
    progress: 0,
    status: "Waiting for game engine…",
    isComplete: false,
    currentFile: "",
    error: null,
  });

  const fileProgressRef = useRef(new Map<string, Progress>());
  const rafRef = useRef<number | null>(null);

  // Bytes-based progress pump (works even if totals are unknown)
  const pump = () => {
    rafRef.current = null;

    let totalLoaded = 0;
    let totalSize = 0;
    let label = "";

    for (const a of ASSETS) {
      const p = fileProgressRef.current.get(a.filename);
      if (!p) continue;
      totalLoaded += p.loaded || 0;
      if (p.total) totalSize += p.total;

      if (p.total) {
        const pct = Math.max(0, Math.min(1, p.loaded / p.total));
        label = `${a.filename} ${Math.round(pct * 100)}%`;
      } else {
        const mb = (p.loaded / (1024 * 1024)).toFixed(1);
        label = `${a.filename} ${mb}MB`;
      }
    }

    const progress =
      totalSize > 0
        ? Math.round((totalLoaded / totalSize) * 100)
        : totalLoaded > 0
        ? 1 // nudge the bar off 0% if we have bytes but no totals
        : 0;

    setUi((s) => ({ ...s, progress, currentFile: label }));
  };

  const schedulePump = () => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(pump);
  };

  useEffect(() => {
    let cancelled = false;
    if (!gc) return;

    const app: any = (gc as any)?.renderer?.app;
    const wasRunning = !!app?.ticker?.started;
    app?.ticker?.stop?.();

    const setSafe = (patch: Partial<UIState>) => !cancelled && setUi((s) => ({ ...s, ...patch }));

    (async () => {
      try {
        if (!CDN_BASE) throw new Error("ASSET_BASE_URL is not defined. Set it and rebuild.");

        setSafe({ status: "Checking assets…", error: null });

        const upToDate = await gc.database.areAssetsUpToDate();
        if (upToDate) {
          setSafe({ progress: 100, status: "Assets up to date!", isComplete: true, currentFile: "" });
          setTimeout(() => !cancelled && onDownloadComplete(), 200);
          return;
        }

        setSafe({ status: "Downloading assets…", progress: 0, currentFile: "" });

        const buffers = await loader.fetchAllSequential(ASSETS, (name, p) => {
          fileProgressRef.current.set(name, p);
          schedulePump();
        });

        setSafe({ status: "Processing assets…" });
        await processDownloaded(gc, buffers);

        setSafe({ status: "Download complete!", progress: 100, isComplete: true, currentFile: "" });
        setTimeout(() => !cancelled && onDownloadComplete(), 200);
      } catch (e: any) {
        setSafe({
          status: "Download failed.",
          error: e?.message || "Please try again.",
          isComplete: false,
          currentFile: "",
          progress: 0,
        });
      } finally {
        if (wasRunning) app?.ticker?.start?.();
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [gc, onDownloadComplete]);

  const { progress, status, isComplete, currentFile, error } = ui;

  return (
    <div className="asset-download-container">
      <h2 className="asset-download-title">Downloading Game Assets</h2>
      <div className="progress-section">
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-status">
          {status} {currentFile && <span>• {currentFile}</span>}
        </div>
        <div className="progress-percentage">{progress}%</div>
      </div>
      {isComplete && <div className="download-complete">✅ Ready to play!</div>}
      {error && (
        <div className="download-error">
          <div className="error-text">{error}</div>
        </div>
      )}
      <div className="download-note">Large files; first launch can take a bit.</div>
    </div>
  );
}

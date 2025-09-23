import React, { useEffect, useRef, useState } from "react";
import type GameClient from "../../../core/gameclient";
import SpriteBuffer from "../../../renderer/sprite-buffer";
import "./styles/AssetDownload.scss";

interface AssetDownloadProps {
  gc: GameClient | null | undefined;            // tolerate not-yet-ready gc
  onDownloadComplete: () => void;
}

type UIState = {
  progress: number;         // 0..100 overall
  status: string;           // human readable
  isComplete: boolean;
  currentFile: string;
  error?: string | null;
};

type GameAsset = { url: string; filename: string };

const ASSETS: GameAsset[] = [
  { url: "/data/sprites/Tibia.spr", filename: "Tibia.spr" },
  { url: "/data/sprites/Tibia.dat", filename: "Tibia.dat" },
];

// small helper: fetch with progress, streaming if possible, with abort support
async function fetchArrayBufferWithProgress(
  input: RequestInfo,
  onProgress: (loaded: number, total?: number) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const res = await fetch(input, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  // If ReadableStream is available, stream it
  const total = Number(res.headers.get("content-length") || 0) || undefined;
  if (res.body && "getReader" in res.body) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(loaded, total);
      }
    }
    const blob = new Blob(chunks);
    return blob.arrayBuffer();
  }

  // Fallback: no stream available
  const buf = await res.arrayBuffer();
  onProgress(buf.byteLength, buf.byteLength);
  return buf;
}

// try HEAD to get sizes, but tolerate CORS
async function tryHeadSize(url: string, signal?: AbortSignal): Promise<number | undefined> {
  try {
    const r = await fetch(url, { method: "HEAD", signal });
    const len = r.headers.get("content-length");
    return len ? Number(len) : undefined;
  } catch {
    return undefined;
  }
}

export default function AssetDownload({ gc, onDownloadComplete }: AssetDownloadProps) {
  const [state, setState] = useState<UIState>({
    progress: 0,
    status: "Waiting for game engine…",
    isComplete: false,
    currentFile: "",
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // start only when gc is available
  useEffect(() => {
    if (!gc) return;

    const run = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const setSafe = (patch: Partial<UIState>) =>
        mountedRef.current && setState((s) => ({ ...s, ...patch }));

      try {
        // 1) quick up-to-date check
        setSafe({ status: "Checking assets…", error: null });
        const upToDate = await gc.database.areAssetsUpToDate();
        if (upToDate) {
          setSafe({ progress: 100, status: "Assets up to date!", isComplete: true, currentFile: "" });
          setTimeout(() => mountedRef.current && onDownloadComplete(), 600);
          return;
        }

        // 2) total size (best-effort)
        setSafe({ status: "Calculating download size…" });
        const sizes = await Promise.all(
          ASSETS.map((a) => tryHeadSize(a.url, controller.signal))
        );
        const totalBytesKnown = sizes.every((n) => typeof n === "number");
        const totalBytes = totalBytesKnown
          ? (sizes as number[]).reduce((acc, n) => acc + n, 0)
          : undefined;

        // 3) download sequentially (makes overall progress easier)
        let overallLoaded = 0;
        const buffers = new Map<string, ArrayBuffer>();

        for (let i = 0; i < ASSETS.length; i++) {
          const asset = ASSETS[i];
          setSafe({ currentFile: asset.filename, status: `Downloading ${asset.filename}…` });

          const buf = await fetchArrayBufferWithProgress(
            asset.url,
            (fileLoaded, fileTotal) => {
              if (controller.signal.aborted) return;

              // compute overall progress
              let overall: number;
              if (totalBytes && fileTotal) {
                // precise byte-based
                const prevLoaded = overallLoaded;
                const currentWeighted = prevLoaded + fileLoaded;
                overall = (currentWeighted / totalBytes) * 100;
              } else {
                // fallback equal weights
                const fileRatio = fileTotal ? fileLoaded / fileTotal : 0;
                const perFileWeight = 1 / ASSETS.length;
                overall = ((i + fileRatio) * perFileWeight) * 100;
              }

              setSafe({
                progress: Math.min(100, Math.max(0, Math.round(overall))),
                status: `Downloading ${asset.filename}… ${fileTotal ? Math.round((fileLoaded / fileTotal) * 100) : 0}%`,
              });
            },
            controller.signal
          );

          buffers.set(asset.filename, buf);
          // finalize this file’s bytes for overall calculation
          overallLoaded += sizes[i] ?? buf.byteLength;
        }

        // 4) process assets
        setSafe({ status: "Processing assets…" });
        await processDownloadedAssets(gc, buffers);

        // 5) done
        setSafe({ progress: 100, status: "Download complete!", isComplete: true, currentFile: "" });
        setTimeout(() => mountedRef.current && onDownloadComplete(), 600);
      } catch (e: any) {
        if (controller.signal.aborted) return;
        console.error("❌ Asset download failed:", e);
        setSafe({
          error: e?.message || "Download failed. Please try again.",
          status: "Download failed.",
          isComplete: false,
          currentFile: "",
          progress: 0,
        });
      }
    };

    run();
  }, [gc, onDownloadComplete]);

  const handleRetry = () => {
    abortRef.current?.abort();
    setState({
      progress: 0,
      status: "Retrying…",
      isComplete: false,
      currentFile: "",
      error: null,
    });
    // retrigger effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (async () => {
      // small microtask to let state flush; effect depends on `gc` and will re-run
      await Promise.resolve();
      if (gc) {
        // no-op; effect will run naturally because state changed and gc is stable
      }
    })();
  };

  // UI
  const { progress, status, isComplete, currentFile, error } = state;

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

        <div className="progress-percentage">{Math.round(progress)}%</div>
      </div>

      {isComplete && <div className="download-complete">✅ Ready to play!</div>}

      {error && (
        <div className="download-error">
          <div className="error-text">{error}</div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      )}

      <div className="download-note">This may take a few minutes depending on your connection speed.</div>
    </div>
  );
}

async function processDownloadedAssets(gc: GameClient, results: Map<string, ArrayBuffer>): Promise<void> {
  const datData = results.get("Tibia.dat");
  const sprData = results.get("Tibia.spr");
  if (!datData || !sprData) throw new Error("Missing required game assets");

  // Match your existing loaders that expect a FileReader-like event
  gc.dataObjects.load("Tibia.dat", { target: { result: datData } } as unknown as ProgressEvent<FileReader>);
  SpriteBuffer.load("Tibia.spr", { target: { result: sprData } } as unknown as ProgressEvent<FileReader>);
}

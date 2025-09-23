import { useEffect, useMemo, useRef, useState } from 'react';
import Renderer from './renderer/renderer';
import GameClient from './core/gameclient';

type GCStatus = 'idle' | 'waiting-container' | 'bootstrapping' | 'ready' | 'error';

function waitForDom(selector: string, timeoutMs = 8000, stepMs = 50) {
  return new Promise<HTMLElement>((resolve, reject) => {
    const start = performance.now();
    const tick = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return resolve(el);
      if (performance.now() - start >= timeoutMs) {
        return reject(new Error(`Timeout waiting for ${selector}`));
      }
      setTimeout(tick, stepMs);
    };
    tick();
  });
}

function waitFor<T>(check: () => T | null | undefined, timeoutMs = 8000, stepMs = 50) {
  return new Promise<T>((resolve, reject) => {
    const start = performance.now();
    const tick = () => {
      try {
        const value = check();
        if (value) return resolve(value);
      } catch {}
      if (performance.now() - start >= timeoutMs) {
        return reject(new Error('Timeout waiting for condition'));
      }
      setTimeout(tick, stepMs);
    };
    tick();
  });
}

export function useGameClient(shouldInit: boolean) {
  const [status, setStatus] = useState<GCStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [gc, setGc] = useState<GameClient | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!shouldInit || startedRef.current || gc) return;
      startedRef.current = true;
      try {
        setStatus('waiting-container');
        await waitForDom('#game-container');

        setStatus('bootstrapping');
        const renderer = await Renderer.create();
        const client = new GameClient(renderer);
        (window as any).gameClient = client;

        await waitFor(() => (client.interface ? client : null));

        if (!cancelled) {
          setGc(client);
          setStatus('ready');
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e);
          setStatus('error');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [shouldInit, gc]);

  return useMemo(() => ({ gc, status, error }), [gc, status, error]);
}

// utils/outfit-renderer.ts
import type GameClient from "../core/gameclient";
import type Outfit from "../game/outfit";

type DrawPiece = {
  src: HTMLImageElement | HTMLCanvasElement;
  sx: number; sy: number; sw: number; sh: number;
  dx: number; dy: number; dw: number; dh: number;
};


function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function collectOutfitDrawPieces(
  gc: GameClient,
  outfit: Outfit,
  faceDirection: number,
  animate: boolean
): { pieces: DrawPiece[]; bounds: { left: number; top: number; right: number; bottom: number } } | null {
  const data = gc.dataObjects.getOutfit(outfit.id);
  if (!data) return null;
  const base = data.getFrameGroup(animate ? 1 : 0);
  if (!base) return null;

  const xPattern = faceDirection % 4;
  const frame = animate ? base.getAlwaysAnimatedFrame() : 0;
  const zPattern = base.pattern?.z > 1 && outfit.mounted ? 1 : 0;

  const pieces: DrawPiece[] = [];
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;

  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      const id = base.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
      if (!id) continue;
      const tex: any = gc.spriteBuffer.get(id);
      const src = tex?.source?.resource as HTMLImageElement | HTMLCanvasElement | undefined;
      const fr = tex?.frame as { x: number; y: number; width: number; height: number } | undefined;
      if (!src || !fr) continue;
      const dx = -x * fr.width;
      const dy = -y * fr.height;
      const dw = fr.width;
      const dh = fr.height;
      pieces.push({ src, sx: fr.x, sy: fr.y, sw: fr.width, sh: fr.height, dx, dy, dw, dh });
      if (dx < left) left = dx;
      if (dy < top) top = dy;
      if (dx + dw > right) right = dx + dw;
      if (dy + dh > bottom) bottom = dy + dh;
    }
  }

  const hairObj = outfit.getHairDataObject ? outfit.getHairDataObject() : null;
  if (hairObj) {
    const hair = hairObj.getFrameGroup(animate ? 1 : 0);
    if (hair) {
      for (let y = 0; y < hair.height; y++) {
        for (let x = 0; x < hair.width; x++) {
          const baseId = hair.getSpriteId(frame, xPattern, 0, zPattern, 0, x, y);
          if (!baseId) continue;
          const key = (window as any).gameClient.spriteBuffer.constructor.getComposedKey(outfit, baseId, hair, frame, xPattern, 0, zPattern, x, y);
          const hash = hashString(key);
          if (!(gc.spriteBuffer.has(hash))) {
            const maskId = hair.getSpriteId(frame, xPattern, 0, zPattern, 1, x, y);
            gc.spriteBuffer.addComposedOutfit(key, outfit, baseId, maskId);
          }
          const tex: any = gc.spriteBuffer.get(hash);
          const src = tex?.source?.resource as HTMLImageElement | HTMLCanvasElement | undefined;
          const fr = tex?.frame as { x: number; y: number; width: number; height: number } | undefined;
          if (!src || !fr) continue;
          const dx = -x * fr.width;
          const dy = -y * fr.height;
          const dw = fr.width;
          const dh = fr.height;
          pieces.push({ src, sx: fr.x, sy: fr.y, sw: fr.width, sh: fr.height, dx, dy, dw, dh });
          if (dx < left) left = dx;
          if (dy < top) top = dy;
          if (dx + dw > right) right = dx + dw;
          if (dy + dh > bottom) bottom = dy + dh;
        }
      }
    }
  }

  if (!pieces.length) return null;
  return { pieces, bounds: { left, top, right, bottom } };
}

export function renderOutfitToCanvas(
  gc: GameClient,
  outfit: Outfit,
  canvas: HTMLCanvasElement,
  options: {
    faceDirection?: number;
    animate?: boolean;
    padding?: number;
    background?: string;
  } = {}
): boolean {
  const faceDirection = options.faceDirection ?? 2;
  const animate = options.animate ?? false;
  const padding = options.padding ?? 1;
  const background = options.background ?? "transparent";

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const collected = collectOutfitDrawPieces(gc, outfit, faceDirection, animate);
  if (!collected) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return false;
  }

  const { pieces, bounds } = collected;
  const contentW = bounds.right - bounds.left;
  const contentH = bounds.bottom - bounds.top;
  const maxScale = Math.min((canvas.width - padding * 2) / contentW, (canvas.height - padding * 2) / contentH);
  const scale = Math.max(2, Math.floor(maxScale));
  const drawW = Math.floor(contentW * scale);
  const drawH = Math.floor(contentH * scale);
  const originX = Math.floor((canvas.width - drawW) / 2);
  const originY = Math.floor((canvas.height - drawH) / 2);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (background !== "transparent") {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = false;
  const EPS = 0.01;

  for (const p of pieces) {
    const dx = originX + Math.floor((p.dx - bounds.left) * scale);
    const dy = originY + Math.floor((p.dy - bounds.top) * scale);
    const dw = Math.floor(p.dw * scale);
    const dh = Math.floor(p.dh * scale);

    const sx = p.sx + EPS;
    const sy = p.sy + EPS;
    const sw = p.sw - EPS * 2;
    const sh = p.sh - EPS * 2;

    ctx.drawImage(p.src, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  return true;
}

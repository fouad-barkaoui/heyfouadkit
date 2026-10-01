import { Camera, Check, ImagePlus, Loader2, Minus, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_SOURCE_BYTES,
  clampCrop,
  coverScale,
  loadImage,
  renderCrop,
  type CropState,
} from '@/data/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/state/authStore';
import { translate, useLanguage } from '@/state/languageStore';

const FRAME = 232;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Feedback = { tone: 'ok' | 'bad'; text: string } | null;

/**
 * Profile picture control: drop or pick an image, frame it in a circular
 * cropper (drag to move, scroll / pinch / slider to zoom, arrow keys to
 * nudge), then save. Signed in, the result goes to the account's cloud
 * folder; otherwise it's kept on this device.
 */
export function AvatarEditor({ name, pro = false }: { name: string; pro?: boolean }): JSX.Element {
  const { avatarUrl, setAvatar, user } = useAuth();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Revoke object URLs we created once they're no longer shown.
  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source.url);
  }, [source]);

  const openFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setFeedback(null);
    if (!file.type.startsWith('image/')) {
      setFeedback({ tone: 'bad', text: translate('prof.err.notImage') });
      return;
    }
    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
      setFeedback({ tone: 'bad', text: translate('prof.err.tooBig') });
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      setSource({ url, img });
      setCrop({ zoom: 1, x: 0, y: 0 });
    } catch (err) {
      URL.revokeObjectURL(url);
      setFeedback({ tone: 'bad', text: err instanceof Error ? err.message : translate('prof.err.cantOpen') });
    }
  }, []);

  const update = useCallback(
    (next: CropState) => {
      if (!source) return;
      setCrop(clampCrop(source.img, { ...next, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.zoom)) }));
    },
    [source],
  );

  /* ── Drag / pinch ─────────────────────────────────────────────────── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ crop: CropState; x: number; y: number; dist: number } | null>(null);

  const startGesture = (): void => {
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const dist = pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
    gesture.current = { crop, x: cx, y: cy, dist };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const g = gesture.current;
    let zoom = g.crop.zoom;
    if (pts.length > 1 && g.dist > 0) {
      zoom = g.crop.zoom * (Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) / g.dist);
    }
    update({ zoom, x: g.crop.x + (cx - g.x) / FRAME, y: g.crop.y + (cy - g.y) / FRAME });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size) startGesture();
    else gesture.current = null;
  };

  // Wheel zoom needs a non-passive listener to stop the modal scrolling.
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      setCrop((c) =>
        source
          ? clampCrop(source.img, { ...c, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * Math.exp(-e.deltaY * 0.0015))) })
          : c,
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [source]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const step = e.shiftKey ? 0.05 : 0.012;
    const moves: Record<string, [number, number, number]> = {
      ArrowLeft: [-step, 0, 1],
      ArrowRight: [step, 0, 1],
      ArrowUp: [0, -step, 1],
      ArrowDown: [0, step, 1],
      '+': [0, 0, 1.08],
      '=': [0, 0, 1.08],
      '-': [0, 0, 1 / 1.08],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    update({ zoom: crop.zoom * m[2], x: crop.x + m[0], y: crop.y + m[1] });
  };

  const save = async (): Promise<void> => {
    if (!source) return;
    setBusy(true);
    setFeedback(null);
    try {
      const blob = await renderCrop(source.img, crop);
      const result = await setAvatar(blob);
      if (result.ok) {
        setSource(null);
        setJustSaved(true);
        window.setTimeout(() => setJustSaved(false), 1400);
        setFeedback({ tone: 'ok', text: result.message ?? t('prof.updated') });
      } else {
        setFeedback({ tone: 'bad', text: result.error });
      }
    } catch (err) {
      setFeedback({ tone: 'bad', text: err instanceof Error ? err.message : t('prof.err.cantSave') });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    setFeedback(null);
    const result = await setAvatar(null);
    setBusy(false);
    setFeedback(result.ok ? { tone: 'ok', text: result.message ?? t('prof.removed') } : { tone: 'bad', text: result.error });
  };

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={AVATAR_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        void openFile(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  /* ── Crop stage ───────────────────────────────────────────────────── */
  if (source) {
    const s = coverScale(source.img, FRAME) * crop.zoom;
    const w = source.img.naturalWidth * s;
    const h = source.img.naturalHeight * s;
    const pct = ((crop.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
    return (
      <div className="avatar-crop anim-scale-in flex flex-col items-center">
        {hiddenInput}
        <div
          ref={frameRef}
          role="application"
          tabIndex={0}
          aria-label={t('prof.cropLabel')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          className="avatar-crop-frame relative cursor-grab touch-none select-none overflow-hidden rounded-[18px] active:cursor-grabbing"
          style={{ width: FRAME, height: FRAME }}
        >
          <img
            src={source.url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              width: w,
              height: h,
              left: FRAME / 2 + crop.x * FRAME - w / 2,
              top: FRAME / 2 + crop.y * FRAME - h / 2,
            }}
          />
          <div className="avatar-crop-mask pointer-events-none absolute inset-0" aria-hidden />
          <div className="avatar-crop-grid pointer-events-none absolute inset-0" aria-hidden />
        </div>

        <div className="mt-4 flex w-full max-w-[260px] items-center gap-2.5">
          <button type="button" className="btn-icon" aria-label={t('prof.zoomOut')} onClick={() => update({ ...crop, zoom: crop.zoom / 1.15 })}>
            <Minus size={14} strokeWidth={2} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            aria-label={t('prof.zoom')}
            onChange={(e) => update({ ...crop, zoom: Number(e.target.value) })}
            className="avatar-zoom flex-1"
            style={{ ['--pct' as string]: `${pct}%` }}
          />
          <button type="button" className="btn-icon" aria-label={t('prof.zoomIn')} onClick={() => update({ ...crop, zoom: crop.zoom * 1.15 })}>
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-ash">{t('prof.cropHint')}</p>

        <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
          <Button variant="quiet" disabled={busy} onClick={() => setSource(null)} icon={<X size={13} strokeWidth={2} />}>
            {t('prof.cancel')}
          </Button>
          <Button
            variant="quiet"
            disabled={busy}
            onClick={() => setCrop({ zoom: 1, x: 0, y: 0 })}
            icon={<RotateCcw size={13} strokeWidth={2} />}
          >
            {t('prof.reset')}
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.2} />}
            {busy ? t('prof.saving') : t('prof.savePicture')}
          </Button>
        </div>
        {feedback ? (
          <p className={cn('mt-3 text-center text-[12px]', feedback.tone === 'bad' ? 'text-coral' : 'text-pulse')}>{feedback.text}</p>
        ) : null}
      </div>
    );
  }

  /* ── Idle ─────────────────────────────────────────────────────────── */
  return (
    <div
      className={cn('avatar-drop flex items-center gap-4 rounded-[12px] p-3', dragOver && 'is-over')}
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void openFile(e.dataTransfer.files[0]);
      }}
    >
      {hiddenInput}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn('avatar-trigger group relative shrink-0 rounded-full', justSaved && 'is-saved')}
        aria-label={avatarUrl ? t('prof.changePicture') : t('prof.addPicture')}
      >
        <Avatar src={avatarUrl} name={name} size={76} pro={pro} />
        <span className="avatar-trigger-veil absolute inset-0 flex items-center justify-center rounded-full">
          <Camera size={18} strokeWidth={1.8} aria-hidden />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-paper">{t('prof.picture')}</p>
        <p className="mt-0.5 text-[11.5px] leading-[1.5] text-ash">
          {dragOver
            ? t('prof.dropHere')
            : user
              ? t('prof.hintSignedIn')
              : t('prof.hintLocal')}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button onClick={() => inputRef.current?.click()} disabled={busy} icon={<ImagePlus size={13} strokeWidth={1.9} />}>
            {avatarUrl ? t('prof.change') : t('prof.upload')}
          </Button>
          {avatarUrl ? (
            <Button
              variant="quiet"
              disabled={busy}
              onClick={() => void remove()}
              icon={busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={1.9} />}
            >
              {t('prof.remove')}
            </Button>
          ) : null}
        </div>
        {feedback ? (
          <p className={cn('mt-2 text-[12px]', feedback.tone === 'bad' ? 'text-coral' : 'text-pulse')}>{feedback.text}</p>
        ) : null}
      </div>
    </div>
  );
}

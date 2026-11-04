import { useEffect, useRef, useState } from "react";
import { Alert, Avatar, Button, Dialog, DialogContent, FormField, Input } from "../../../../shared/ui";
import type { ProfileDraft, PhotoDraft } from "../profileDraft";
import { cropPhoto, drawPhoto, readPhoto } from "./photoCrop";
import styles from "../ProfileWorkspace.module.css";

export function PhotoDialog({ name, draft, onApply, onRemove, onClose }: {
  name: string; draft: ProfileDraft; onApply: (photo: PhotoDraft) => void; onRemove: () => void; onClose: () => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1), [x, setX] = useState(50), [y, setY] = useState(50);
  const [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const selected = useRef(0);
  useEffect(() => {
    if (image && canvas.current) drawPhoto(canvas.current, image, zoom, x, y);
  }, [image, zoom, x, y]);
  async function choose(file?: File) {
    if (!file) return;
    const version = ++selected.current;
    setLoading(true); setError(null);
    try {
      const next = await readPhoto(file);
      if (version === selected.current) { setImage(next); setZoom(1); setX(50); setY(50); }
    } catch (caught) { if (version === selected.current) setError(caught instanceof Error ? caught.message : "Could not read photo."); }
    finally { if (version === selected.current) setLoading(false); }
  }
  function apply() {
    if (!image) return;
    try { onApply(cropPhoto(image, zoom, x, y)); onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not crop photo."); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent title="Profile photo" description="Your photo appears on your public profile."
      footer={<div className={styles.actions}>
        {(draft.photo || draft.photoUrl) && <Button variant="danger" onClick={() => { onRemove(); onClose(); }}>Remove photo</Button>}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!image || loading} onClick={apply}>Use photo</Button>
      </div>}>
      <div className={styles.stack}>
        {error && <Alert kind="error">{error}</Alert>}
        <FormField label="Choose photo" hint="JPG, PNG or WebP · up to 2 MB">
          <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={loading}
            onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
        </FormField>
        {loading && <p role="status">Opening photo…</p>}
        {image ? <>
          <div className={styles.crop}><canvas ref={canvas} aria-label="Profile photo crop preview" role="img" /></div>
          {([["Zoom", zoom, setZoom, 1, 3, 0.05], ["Horizontal", x, setX, 0, 100, 1],
            ["Vertical", y, setY, 0, 100, 1]] as const).map(([label, value, setter, min, max, step]) =>
              <label className={styles.range} key={label}>{label}<input type="range" value={value} min={min} max={max} step={step}
                onChange={(event) => setter(Number(event.target.value))} /></label>)}
        </> : <Avatar name={name} src={draft.photo?.preview ?? draft.photoUrl} size="xl" />}
      </div>
    </DialogContent>
  </Dialog>;
}

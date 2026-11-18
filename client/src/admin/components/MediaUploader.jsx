import { useId, useRef, useState } from 'react';
import { CloseIcon } from '../../components/ui/Icons.jsx';
import { api } from '../../services/api.js';
import { cx } from '../../utils/format.js';
import { resized } from '../../utils/media.js';

const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif';
const VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime';

// Sends one file to the media service and reports progress as a percentage.
export const uploadFile = (file, onProgress) => {
  const body = new FormData();
  body.append('file', file);
  return api.post('/admin/media', body, {
    timeout: 0,
    onUploadProgress: (event) => onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
  });
};

const DropZone = ({ accept, multiple, onFiles, busy, progress, children, className }) => {
  const inputRef = useRef(null);
  const id = useId();
  const [over, setOver] = useState(false);

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!busy) onFiles([...event.dataTransfer.files]);
      }}
      className={cx(
        'flex cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-6 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2',
        over ? 'border-ink bg-bone' : 'border-stone hover:border-ink',
        busy && 'pointer-events-none opacity-70',
        className,
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          onFiles([...event.target.files]);
          event.target.value = '';
        }}
      />
      {busy ? (
        <div className="w-full max-w-40" role="status">
          <p className="text-sm font-medium">Uploading… {progress}%</p>
          <div className="mt-2 h-1 bg-mist">
            <div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        children
      )}
    </label>
  );
};

const useUpload = (onDone) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const upload = async (files) => {
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of files) {
        setProgress(0);
        onDone(await uploadFile(file, setProgress));
      }
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, progress, error, upload };
};

// ── One image or video (hero, category, collection cover…) ───────────────
// value: { url, type, posterUrl }   onChange(nextValue | null)

export const MediaField = ({ label, hint, value, onChange, allowVideo = false, aspect = 'aspect-[4/3]' }) => {
  const { busy, progress, error, upload } = useUpload((media) =>
    onChange({ url: media.url, type: media.type, posterUrl: media.posterUrl || '', publicId: media.publicId }),
  );
  const hasMedia = Boolean(value?.url);

  return (
    <div>
      {label && <p className="mb-1.5 text-[0.8125rem] font-medium">{label}</p>}
      {hasMedia ? (
        <div className={cx('relative overflow-hidden border border-mist bg-bone', aspect)}>
          {value.type === 'VIDEO' ? (
            <video src={value.url} poster={value.posterUrl || undefined} className="absolute inset-0 size-full object-cover" muted controls playsInline preload="metadata" />
          ) : (
            <img src={resized(value.url, 800)} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex items-center gap-2 bg-ink px-3 py-2 text-[0.75rem] font-medium text-paper"
          >
            <CloseIcon size={9} /> Remove
          </button>
        </div>
      ) : (
        <DropZone
          accept={allowVideo ? `${IMAGE_TYPES},${VIDEO_TYPES}` : IMAGE_TYPES}
          onFiles={(files) => upload(files.slice(0, 1))}
          busy={busy}
          progress={progress}
          className={aspect}
        >
          <p className="text-sm font-medium">Click to upload{allowVideo ? ' an image or video' : ' an image'}</p>
          <p className="mt-1 text-[0.8125rem] text-graphite">or drag a file here</p>
        </DropZone>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[0.8125rem] text-graphite">{hint}</p>
      )}
    </div>
  );
};

// ── Product photo gallery: many images, reorderable, optional colour tag ─
// images: [{ url, publicId, alt, colour, width, height }]

export const ImageGallery = ({ images, onChange, colours = [], error }) => {
  // Uploads finish one after another; this always holds the newest list to add to
  const latest = useRef(images);
  latest.current = images;

  const addFiles = async (files) => {
    const picked = files.filter((file) => file.type.startsWith('image/'));
    for (const file of picked) await uploadOne(file);
  };

  const [state, setState] = useState({ busy: false, progress: 0, error: '' });
  const uploadOne = async (file) => {
    setState({ busy: true, progress: 0, error: '' });
    try {
      const media = await uploadFile(file, (value) => setState((s) => ({ ...s, progress: value })));
      const next = [...latest.current, { url: media.url, publicId: media.publicId, width: media.width, height: media.height, alt: '', colour: '' }];
      latest.current = next;
      onChange(next);
      setState({ busy: false, progress: 0, error: '' });
    } catch (failure) {
      setState({ busy: false, progress: 0, error: failure.message });
    }
  };

  const move = (index, delta) => {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const update = (index, changes) => onChange(images.map((image, i) => (i === index ? { ...image, ...changes } : image)));
  const remove = (index) => onChange(images.filter((_, i) => i !== index));

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.url} className="border border-mist bg-white">
            <div className="relative aspect-[4/5] overflow-hidden bg-bone">
              <img src={resized(image.url, 480)} alt="" className="absolute inset-0 size-full object-cover" />
              {index === 0 && <span className="absolute left-2 top-2 bg-ink px-2 py-1 text-[0.6875rem] font-medium text-paper">Main image</span>}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove image ${index + 1}`}
                className="absolute right-2 top-2 flex size-7 items-center justify-center bg-ink text-paper"
              >
                <CloseIcon size={9} />
              </button>
            </div>
            <div className="space-y-2 p-2">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="flex-1 border border-mist py-1 text-[0.75rem] disabled:opacity-30">
                  ← Earlier
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} className="flex-1 border border-mist py-1 text-[0.75rem] disabled:opacity-30">
                  Later →
                </button>
              </div>
              {colours.length > 1 && (
                <select
                  value={image.colour || ''}
                  onChange={(event) => update(index, { colour: event.target.value })}
                  aria-label={`Colour shown in image ${index + 1}`}
                  className="block w-full border border-mist bg-white px-2 py-1.5 text-[0.8125rem]"
                >
                  <option value="">Shows: any colour</option>
                  {colours.map((colour) => (
                    <option key={colour} value={colour}>
                      Shows: {colour}
                    </option>
                  ))}
                </select>
              )}
              <input
                value={image.alt || ''}
                onChange={(event) => update(index, { alt: event.target.value })}
                placeholder="Describe this photo"
                aria-label={`Description of image ${index + 1}`}
                className="block w-full border border-mist px-2 py-1.5 text-[0.8125rem] placeholder:text-stone"
              />
            </div>
          </li>
        ))}
        {images.length < 12 && (
          <li>
            <DropZone accept={IMAGE_TYPES} multiple onFiles={addFiles} busy={state.busy} progress={state.progress} className="aspect-[4/5] h-full min-h-40">
              <p className="text-sm font-medium">Add photos</p>
              <p className="mt-1 text-[0.8125rem] text-graphite">Click or drag files here</p>
            </DropZone>
          </li>
        )}
      </ul>
      {(state.error || error) && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
          {state.error || error}
        </p>
      )}
      <p className="mt-2 text-[0.8125rem] text-graphite">
        JPG, PNG or WebP, up to 12 MB each. Portrait photos (4:5) look best. The first photo is the one shoppers see in the shop.
      </p>
    </div>
  );
};

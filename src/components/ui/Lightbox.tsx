import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { createPortal } from 'react-dom';

interface LightboxImage {
  url: string;
  alt?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const CLICK_ZOOM_SCALE = 2.5;

export function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const total = images.length;
  const current = images[index];

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  // Reset zoom/pan whenever the photo changes.
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && total > 1) onIndexChange((index - 1 + total) % total);
      if (event.key === 'ArrowRight' && total > 1) onIndexChange((index + 1) % total);
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [index, total, onClose, onIndexChange]);

  // Track drag on the document so a fast drag that leaves the image doesn't
  // get "stuck" mid-pan.
  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(event: globalThis.MouseEvent) {
      setOffset({
        x: offsetStart.current.x + (event.clientX - dragStart.current.x),
        y: offsetStart.current.y + (event.clientY - dragStart.current.y),
      });
    }
    function handleMouseUp() {
      setIsDragging(false);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (!current) return null;

  function handleWheel(event: ReactWheelEvent<HTMLImageElement>) {
    event.preventDefault();
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - event.deltaY * 0.0025)));
  }

  function handleImageClick(event: ReactMouseEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (isDragging) return;
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(CLICK_ZOOM_SCALE);
    }
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLImageElement>) {
    if (scale <= 1) return;
    event.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY };
    offsetStart.current = offset;
  }

  return createPortal(
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>

      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-prev"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + total) % total);
          }}
          aria-label="Foto anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      )}

      <img
        src={current.url}
        alt={current.alt ?? ''}
        className="lightbox-image"
        draggable={false}
        onClick={handleImageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.15s ease',
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
      />

      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav-next"
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % total);
          }}
          aria-label="Foto siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      )}

      <span className="lightbox-hint">{scale > 1 ? 'Arrastrá para mover · click para alejar' : 'Click o rueda del mouse para acercar'}</span>

      {total > 1 && (
        <span className="lightbox-counter">
          {index + 1} / {total}
        </span>
      )}
    </div>,
    document.body
  );
}

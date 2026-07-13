import React, { useEffect, useRef, useState } from 'react';
import type { ImageRecord } from '../../../../shared/types';
import { cn } from '../../lib/utils';

interface UseLazyThumbnailReturn {
  ref: React.RefObject<HTMLDivElement>;
  src: string | null;
  loading: boolean;
}

/** 懒加载缩略图:卡片进入视口时才请求 */
export function useLazyThumbnail(image: ImageRecord): UseLazyThumbnailReturn {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          requestedRef.current = true;
          setLoading(true);
          window.lumibox.image.getThumbnail(image.id)
            .then((dataUrl) => setSrc(dataUrl))
            .catch(() => setSrc(null))
            .finally(() => setLoading(false));
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [image.id]);

  return { ref, src, loading };
}

interface ImageCardProps {
  image: ImageRecord;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

export function ImageCard({ image, selected, onClick, onDoubleClick, onDragStart }: ImageCardProps) {
  const { ref, src, loading } = useLazyThumbnail(image);

  return (
    <div
      ref={ref}
      className={cn(
        'image-card group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-border bg-muted',
        selected && 'selected'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      draggable
    >
      {src ? (
        <img src={src} alt={image.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {loading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          ) : image.type === 'video' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m10 9 5 3-5 3z" fill="#9ca3af" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          )}
        </div>
      )}
      {/* 视频播放标识 */}
      {image.type === 'video' && src && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="m8 5 12 7-12 7z" />
            </svg>
          </div>
        </div>
      )}
      {selected && (
        <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {image.name}
      </div>
    </div>
  );
}

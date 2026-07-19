import React, { useEffect, useRef, useState } from 'react';
import type { ImageRecord } from '../../../../shared/types';
import { cn } from '../../lib/utils';

interface UseLazyThumbnailReturn {
  ref: React.RefObject<HTMLDivElement>;
  src: string | null;
  loading: boolean;
  error: boolean;
}

/**
 * 懒加载缩略图:卡片进入视口时才请求
 * - 图片:返回 lumibox://img/<相对路径>(直接加载原图,保持原比例)
 * - 视频:返回 lumibox://thumb/<cacheKey>(加载随机帧 JPG,保持视频帧原比例)
 */
export function useLazyThumbnail(image: ImageRecord): UseLazyThumbnailReturn {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const el = ref.current;
    if (!el) return;

    // 请求缩略图(带重试机制,最多重试 2 次)
    const requestThumb = (attempt: number) => {
      if (cancelledRef.current) return;
      setLoading(true);
      window.lumibox.image.getThumbnail(image.id)
        .then((url) => {
          if (cancelledRef.current) return;
          setSrc(url);
          setLoading(false);
        })
        .catch(() => {
          if (cancelledRef.current) return;
          // 失败后延迟重试(1s → 2s),避免主进程高并发时偶发失败导致永久不显示
          if (attempt < 2) {
            retryCountRef.current = attempt + 1;
            setTimeout(() => requestThumb(attempt + 1), 1000 * (attempt + 1));
          } else {
            setError(true);
            setLoading(false);
          }
        });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          requestThumb(0);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => {
      cancelledRef.current = true;
      observer.disconnect();
    };
  }, [image.id]);

  return { ref, src, loading, error };
}

interface ImageCardProps {
  image: ImageRecord;
  selected: boolean;
  index?: number;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

/**
 * 图片卡片 - 设计稿规范:
 * - 4/3 比例
 * - 1.2rem 圆角
 * - hover scale 1.02 + 阴影增强
 * - 选中态:2px 主色边框 + scale(0.98) + 22px 圆形勾选框(实心蓝圆+白勾)
 * - spring transition(Apple damping 1.0)
 */
export function ImageCard({ image, selected, index = 0, onClick, onDoubleClick, onDragStart }: ImageCardProps) {
  const { ref, src, loading, error } = useLazyThumbnail(image);
  // stagger 40ms 入场动画延迟(最多 30 项内有效)
  const animDelay = `${Math.min(index, 30) * 40}ms`;

  return (
    <div
      ref={ref}
      className={cn(
        'image-card group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg bg-muted animate-fade-in-up',
        selected && 'selected'
      )}
      style={{ animationDelay: animDelay }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      draggable
    >
      {src ? (
        <img
          src={src}
          alt={image.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-spring group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {loading ? (
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-black/5 to-transparent bg-[length:200%_100%]" />
          ) : error ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          ) : image.type === 'video' ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m10 9 5 3-5 3z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          )}
        </div>
      )}

      {/* 视频播放标识 */}
      {image.type === 'video' && src && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition-transform duration-300 ease-spring group-hover:scale-110">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="m8 5 12 7-12 7z" />
            </svg>
          </div>
        </div>
      )}

      {/* 选中态勾选框 - 22px 圆形实心蓝圆+白勾 */}
      {selected && (
        <div className="absolute left-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full check-circle text-white animate-pop-in">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )}

      {/* 视频时长徽章 */}
      {image.type === 'video' && image.duration && (
        <div className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums backdrop-blur-sm">
          {formatDurationShort(image.duration)}
        </div>
      )}

      {/* 文件名 hover 显示 */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {image.name}
      </div>
    </div>
  );
}

// 简短时长格式(用于角标)
function formatDurationShort(seconds: number): string {
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setFullscreenImage } from '../../store/uiSlice';
import { removeImages } from '../../store/imagesSlice';
import { useKeyboard } from '../../hooks/useKeyboard';
import { formatBytes, formatDuration } from '../../lib/utils';
import type { ImageRecord } from '../../../../shared/types';

// 用自定义 lumibox:// 协议加载库内原图
function buildImageUrl(relPath: string): string {
  return `lumibox://img/${encodeURIComponent(relPath)}`;
}

// ============ 自定义视频播放器 ============
function VideoPlayer({ src, onNext, onPrev, fileName, meta }: {
  src: string;
  onNext: () => void;
  onPrev: () => void;
  fileName: string;
  meta: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自动播放
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [src]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
  };

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = Math.max(0, Math.min(1, ratio)) * duration;
  }, [duration]);

  const handleProgressDrag = useCallback((e: React.MouseEvent) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      v.currentTime = ratio * duration;
      setCurrent(ratio * duration);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    handleProgressClick(e);
  }, [duration, handleProgressClick]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setMuted(vol === 0);
    if (v) { v.volume = vol; v.muted = vol === 0; }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const newMuted = !muted;
    setMuted(newMuted);
    v.muted = newMuted;
    if (!newMuted && volume === 0) { setVolume(1); v.volume = 1; }
  }, [muted, volume]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 自动隐藏控制条(3s 鼠标静止)
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    showControlsTemporarily();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing, showControlsTemporarily]);

  // 键盘控制
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === 'm' || e.key === 'M') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, onPrev, onNext, toggleFullscreen, toggleMute]);

  const progressPercent = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center"
      onMouseMove={showControlsTemporarily}
      onClick={(e) => e.stopPropagation()}
      style={{ background: '#000000' }}
    >
      <video
        ref={videoRef}
        src={src}
        className="max-h-full max-w-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        onEnded={() => setPlaying(false)}
        draggable={false}
      />

      {/* ===== 顶部工具栏(52px 毛玻璃) ===== */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          height: '52px',
          background: 'rgba(28, 28, 30, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="truncate text-[14px] font-medium" style={{ color: '#f5f5f7' }}>{fileName}</span>
          <span className="truncate text-[12px]" style={{ color: '#86868b' }}>{meta}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={toggleMute} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10" title={muted ? '取消静音' : '静音'}>
            {muted || volume === 0 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="m23 9-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <button onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10" title={isFullscreen ? '退出全屏' : '全屏'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== 底部播放控制条(72px 毛玻璃) ===== */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 flex items-center gap-6 px-6 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          height: '72px',
          background: 'rgba(28, 28, 30, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 进度条区 */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] tabular-nums leading-none" style={{ color: '#f5f5f7' }}>{formatDuration(current)}</span>
            <span className="text-[12px] tabular-nums leading-none" style={{ color: '#86868b' }}>-{formatDuration(Math.max(0, duration - current))}</span>
          </div>
          <div ref={progressBarRef} className="group relative h-1 cursor-pointer rounded-full" style={{ background: 'rgba(255,255,255,0.18)', transition: 'height 0.2s' }} onClick={handleProgressClick} onMouseDown={handleProgressDrag}>
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${progressPercent}%`, background: '#ffffff' }} />
            <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100" style={{ left: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10" title="上一段">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
          </button>
          <button onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95" style={{ background: '#ffffff' }} title={playing ? '暂停' : '播放'}>
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000"><path d="M8 5.14v14l11-7-11-7z" /></svg>
            )}
          </button>
          <button onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10" title="下一段">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
          </button>
          <div className="flex items-center gap-2 ml-2">
            <button onClick={toggleMute} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10" title={muted ? '取消静音' : '静音'}>
              {muted || volume === 0 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="m23 9-6 6M17 9l6 6" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
              )}
            </button>
            <input
              type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={handleVolumeChange}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full"
              style={{ background: `linear-gradient(to right, #ffffff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.18) ${(muted ? 0 : volume) * 100}%)` }}
            />
          </div>
          <button onClick={toggleFullscreen} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10" title={isFullscreen ? '退出全屏' : '全屏'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 图片查看器 ============
function ImageViewer({ src, scale, onScaleChange }: { src: string; scale: number; onScaleChange: (s: number) => void }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    setPos({ x: 0, y: 0 });
  }, [src]);

  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      onScaleChange(2);
    } else {
      onScaleChange(1);
      setPos({ x: 0, y: 0 });
    }
  }, [scale, onScaleChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  }, [scale, pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  return (
    <img
      src={src}
      alt=""
      className="viewer-image select-none"
      style={{
        maxWidth: '80%',
        maxHeight: '72%',
        objectFit: 'contain',
        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
        cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
        borderRadius: '0.25rem',
        transition: 'transform 0.1s'
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      draggable={false}
    />
  );
}

// ============ 主组件 ============
export default function FullscreenViewer() {
  const dispatch = useDispatch<AppDispatch>();
  const imageId = useSelector((s: RootState) => s.ui.fullscreenImageId);
  const items = useSelector((s: RootState) => s.images.items);
  const searchResults = useSelector((s: RootState) => s.images.searchResults);
  const [scale, setScale] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = searchResults ?? items;
  const currentIndex = imageId ? allItems.findIndex((i) => i.id === imageId) : -1;
  const currentImg = currentIndex >= 0 ? allItems[currentIndex] : null;

  const close = useCallback(() => {
    dispatch(setFullscreenImage(null));
    setScale(1);
  }, [dispatch]);

  const navigate = useCallback((dir: 'next' | 'prev') => {
    if (currentIndex < 0) return;
    const newIndex = dir === 'next'
      ? Math.min(currentIndex + 1, allItems.length - 1)
      : Math.max(currentIndex - 1, 0);
    if (newIndex === currentIndex) return;
    dispatch(setFullscreenImage(allItems[newIndex].id));
  }, [currentIndex, allItems, dispatch]);

  // 3s 鼠标静止自动隐藏控件
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // 删除当前图片(移到回收站,可撤销/恢复)
  // 之前按钮没有 onClick,这里补上完整逻辑:调用 IPC 删除 → 从 store 移除 → 跳到下一张
  // 必须在 useKeyboard 之前声明,否则会触发 "Cannot access before initialization"
  const handleDelete = useCallback(async () => {
    if (!currentImg) return;
    try {
      const result = await window.lumibox.image.deleteMany([currentImg.id]);
      await window.lumibox.undo.pushUndo({
        type: 'delete',
        data: { trashIds: result.trashIds }
      });
      dispatch(removeImages([currentImg.id]));
      // 删除后跳转:优先下一张,否则上一张,否则关闭
      if (allItems.length > 1) {
        const nextIdx = Math.min(currentIndex, allItems.length - 2);
        const nextItem = allItems.filter((i) => i.id !== currentImg.id)[nextIdx];
        if (nextItem) {
          dispatch(setFullscreenImage(nextItem.id));
        } else {
          close();
        }
      } else {
        close();
      }
      toast.success('已删除,可从回收站恢复');
    } catch (e) {
      toast.error('删除失败: ' + (e as Error).message);
    }
  }, [currentImg, allItems, currentIndex, dispatch, close]);

  useKeyboard({
    onEscape: close,
    onNext: () => navigate('next'),
    onPrev: () => navigate('prev'),
    onSpace: () => setScale((s) => (s === 1 ? 2 : 1)),
    onDelete: () => handleDelete()
  }, imageId !== null);

  // 切换图片时重置缩放
  useEffect(() => {
    setScale(1);
  }, [imageId]);

  useEffect(() => {
    showControlsTemporarily();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [showControlsTemporarily, imageId]);

  // 预加载相邻图片原图
  useEffect(() => {
    if (currentIndex < 0) return;
    const preloadIndices = [currentIndex + 1, currentIndex - 1];
    preloadIndices.forEach((idx) => {
      if (idx >= 0 && idx < allItems.length) {
        const item = allItems[idx];
        if (item.type === 'image') {
          const img = new Image();
          img.src = buildImageUrl(item.path);
        }
      }
    });
  }, [currentIndex, allItems]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.max(1, Math.min(5, s + delta)));
  }, []);

  // 按需加载图片元数据(宽高)
  // 扫描器只对视频读取分辨率;图片若数据库未存,打开全屏时实时读一次
  const [imgMeta, setImgMeta] = useState<{ width?: number; height?: number } | null>(null);
  useEffect(() => {
    setImgMeta(null);
    if (!currentImg || currentImg.type !== 'image') return;
    if (currentImg.width && currentImg.height) return;
    let cancelled = false;
    window.lumibox.image.getExif(currentImg.id)
      .then((meta: { width?: number; height?: number }) => {
        if (!cancelled && meta && (meta.width || meta.height)) {
          setImgMeta({ width: meta.width, height: meta.height });
        }
      })
      .catch(() => { /* 忽略 */ });
    return () => { cancelled = true; };
  }, [currentImg]);

  if (!imageId || !currentImg) return null;

  const fullSrc = buildImageUrl(currentImg.path);
  const isVideo = currentImg.type === 'video';

  // 元信息:文件大小 + 分辨率(或视频规格)
  // 图片:优先用数据库存储的 width/height,否则用按需加载的 imgMeta
  // 视频:用数据库存储的 width/height/fps(扫描时已 probe)
  const displayWidth = isVideo ? currentImg.width : (currentImg.width ?? imgMeta?.width);
  const displayHeight = isVideo ? currentImg.height : (currentImg.height ?? imgMeta?.height);
  const metaInfo = isVideo
    ? `${displayWidth ?? '?'}×${displayHeight ?? '?'} · ${currentImg.fps ?? '?'}fps · ${formatBytes(currentImg.size)}`
    : `${displayWidth ?? '?'}×${displayHeight ?? '?'} · ${formatBytes(currentImg.size)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#000000' }}
      onClick={close}
      onMouseMove={showControlsTemporarily}
      onWheel={isVideo ? undefined : handleWheel}
    >
      {/* 媒体内容 */}
      {isVideo ? (
        <VideoPlayer
          src={fullSrc}
          fileName={currentImg.name}
          meta={metaInfo}
          onNext={() => navigate('next')}
          onPrev={() => navigate('prev')}
        />
      ) : (
        <ImageViewer src={fullSrc} scale={scale} onScaleChange={setScale} />
      )}

      {/* ===== 顶部工具栏(52px 毛玻璃) - 仅图片显示 ===== */}
      {!isVideo && (
        <div
          className={`absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 transition-opacity duration-200 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            height: '52px',
            background: 'rgba(28, 28, 30, 0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 左侧:返回按钮 + 文件名 + 元信息 */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              aria-label="返回图库"
              title="关闭 (Esc)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="truncate text-[14px] font-medium" style={{ color: '#f5f5f7' }}>{currentImg.name}</span>
              <span className="hidden whitespace-nowrap truncate text-[12px] sm:inline" style={{ color: '#86868b' }}>{metaInfo}</span>
            </div>
          </div>
          {/* 右侧:操作按钮组(仅保留删除,移除收藏/分享/更多) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleDelete}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              aria-label="删除" title="删除 (Del)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ===== 右侧垂直缩放控制(毛玻璃胶囊) - 仅图片显示 ===== */}
      {!isVideo && (
        <aside
          className={`absolute right-6 top-1/2 z-40 flex flex-col items-center gap-1 rounded-full p-2 transition-opacity duration-200 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            transform: 'translateY(-50%)',
            background: 'rgba(28, 28, 30, 0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 放大 */}
          <button
            onClick={() => setScale((s) => Math.min(5, s + 0.25))}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label="放大" title="放大"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          {/* 缩放百分比 */}
          <span className="whitespace-nowrap py-1 text-center text-[12px] tabular-nums" style={{ color: '#f5f5f7' }}>
            {Math.round(scale * 100)}%
          </span>
          {/* 缩小 */}
          <button
            onClick={() => setScale((s) => Math.max(1, s - 0.25))}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label="缩小" title="缩小"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>
          </button>
          {/* 分隔线 */}
          <div className="my-1" style={{ width: '24px', height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
          {/* 适应窗口 */}
          <button
            onClick={() => { setScale(1); }}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            aria-label="适应窗口" title="重置 (双击图片也可切换)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
          </button>
        </aside>
      )}

      {/* ===== 底部缩略图条(88px 毛玻璃) - 仅图片显示 ===== */}
      {!isVideo && (
        <footer
          className={`absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center transition-opacity duration-200 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            height: '88px',
            background: 'rgba(28, 28, 30, 0.6)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 计数(缩略图条上方居中) */}
          <span
            className="absolute whitespace-nowrap text-[12px] tabular-nums"
            style={{ top: '-28px', left: '50%', transform: 'translateX(-50%)', color: '#86868b' }}
          >
            {currentIndex + 1} / {allItems.length.toLocaleString()}
          </span>

          <div className="flex items-center gap-3">
            {/* 上一张箭头 */}
            <button
              onClick={(e) => { e.stopPropagation(); navigate('prev'); }}
              disabled={currentIndex === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="上一张" title="上一张 (←)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            {/* 缩略图组:显示前后共 5 张 */}
            <div className="flex items-center gap-3">
              {getThumbWindow(allItems, currentIndex, 5).map((item) => {
                const idx = allItems.findIndex((i) => i.id === item.id);
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); dispatch(setFullscreenImage(item.id)); }}
                    className="shrink-0 overflow-hidden transition-all duration-300 focus:outline-none"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '0.6rem',
                      opacity: isActive ? 1 : 0.6,
                      border: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                      transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                      boxSizing: 'border-box'
                    }}
                    aria-label={item.name}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <ThumbImg item={item} />
                  </button>
                );
              })}
            </div>

            {/* 下一张箭头 */}
            <button
              onClick={(e) => { e.stopPropagation(); navigate('next'); }}
              disabled={currentIndex === allItems.length - 1}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="下一张" title="下一张 (→)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

// 获取缩略图窗口(以当前为中心,共 N 项)
function getThumbWindow(items: ImageRecord[], currentIdx: number, count: number): ImageRecord[] {
  const half = Math.floor(count / 2);
  const start = Math.max(0, Math.min(items.length - count, currentIdx - half));
  return items.slice(start, start + count);
}

// 缩略图图片(懒加载)
function ThumbImg({ item }: { item: ImageRecord }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.lumibox.image.getThumbnail(item.id)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [item.id]);

  if (!url) {
    return <div className="h-full w-full" style={{ background: 'rgba(255,255,255,0.08)' }} />;
  }
  return <img src={url} alt={item.name} className="h-full w-full object-cover" draggable={false} />;
}

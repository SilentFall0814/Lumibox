import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setFullscreenImage } from '../../store/uiSlice';
import { useKeyboard } from '../../hooks/useKeyboard';
import { formatDuration } from '../../lib/utils';

// 用自定义 lumibox:// 协议加载库内原图
// 格式: lumibox://img/<url-encoded-relative-path>
function buildImageUrl(relPath: string): string {
  return `lumibox://img/${encodeURIComponent(relPath)}`;
}

// ============ 图标组件 ============
const IconChevronLeft = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const IconChevronRight = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const IconClose = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconPlay = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

const IconPause = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </svg>
);

const IconVolume = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const IconVolumeMute = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="m23 9-6 6M17 9l6 6" />
  </svg>
);

const IconZoomIn = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
  </svg>
);

const IconZoomOut = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35M8 11h6" />
  </svg>
);

const IconExpand = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

// ============ 自定义视频播放器 ============
function VideoPlayer({ src, onNext, onPrev }: { src: string; onNext: () => void; onPrev: () => void }) {
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

  // 更新进度
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

  // 点击进度条跳转
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = Math.max(0, Math.min(1, ratio)) * duration;
  }, [duration]);

  // 拖动进度条
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

  // 自动隐藏控制条
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
      className="relative flex max-h-full max-w-full items-center justify-center"
      onMouseMove={showControlsTemporarily}
      onClick={(e) => e.stopPropagation()}
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

      {/* 自定义控制条 - 白色极简风格 */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 进度条 */}
        <div className="px-4 pb-1">
          <div className="flex items-center gap-2 text-xs text-white/90 mb-1">
            <span className="tabular-nums">{formatDuration(current)}</span>
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              onMouseDown={handleProgressDrag}
              className="group relative h-1 flex-1 cursor-pointer rounded-full bg-white/20"
            >
              {/* 已播放部分 */}
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-blue-500"
                style={{ width: `${progressPercent}%` }}
              />
              {/* 拖动手柄 */}
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                style={{ left: `${progressPercent}%` }}
              />
            </div>
            <span className="tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* 底部控制栏 */}
        <div className="flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-1">
          {/* 上一张 */}
          <button
            onClick={onPrev}
            className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="上一个"
          >
            <IconChevronLeft size={20} />
          </button>

          {/* 播放/暂停 */}
          <button
            onClick={togglePlay}
            className="rounded p-2 text-white transition-colors hover:bg-white/10"
            title={playing ? '暂停' : '播放'}
          >
            {playing ? <IconPause size={22} /> : <IconPlay size={22} />}
          </button>

          {/* 下一张 */}
          <button
            onClick={onNext}
            className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title="下一个"
          >
            <IconChevronRight size={20} />
          </button>

          {/* 音量 */}
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={toggleMute}
              className="rounded p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              title={muted ? '取消静音' : '静音'}
            >
              {muted || volume === 0 ? <IconVolumeMute size={18} /> : <IconVolume size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-blue-500"
              style={{
                background: `linear-gradient(to right, #3b82f6 ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)`
              }}
            />
          </div>

          <div className="flex-1" />

          {/* 全屏 */}
          <button
            onClick={toggleFullscreen}
            className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            <IconExpand size={18} />
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

  // 切换图片时重置位置
  useEffect(() => {
    setPos({ x: 0, y: 0 });
  }, [src]);

  // 双击切换缩放
  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      onScaleChange(2);
    } else {
      onScaleChange(1);
      setPos({ x: 0, y: 0 });
    }
  }, [scale, onScaleChange]);

  // 拖拽平移(仅放大时)
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
      className="max-h-full max-w-full object-contain transition-transform duration-100"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
        cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default'
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

  useKeyboard({
    onEscape: close,
    onNext: () => navigate('next'),
    onPrev: () => navigate('prev'),
    onSpace: () => setScale((s) => (s === 1 ? 2 : 1))
  }, imageId !== null);

  // 切换图片时重置缩放
  useEffect(() => {
    setScale(1);
  }, [imageId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.max(1, Math.min(5, s + delta)));
  }, []);

  if (!imageId || !currentImg) return null;

  const fullSrc = buildImageUrl(currentImg.path);
  const isVideo = currentImg.type === 'video';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={close}
      onWheel={isVideo ? undefined : handleWheel}
    >
      {/* 媒体内容 */}
      {isVideo ? (
        <VideoPlayer
          src={fullSrc}
          onNext={() => navigate('next')}
          onPrev={() => navigate('prev')}
        />
      ) : (
        <ImageViewer src={fullSrc} scale={scale} onScaleChange={setScale} />
      )}

      {/* 顶部栏:关闭按钮 + 文件名 */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-sm text-white/80">
          <span className="truncate max-w-md">{currentImg.name}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/60">{currentIndex + 1} / {allItems.length}</span>
        </div>
        <button
          onClick={close}
          className="rounded-lg p-2 text-white/80 transition-all hover:bg-white/15 hover:text-white"
          title="关闭 (Esc)"
        >
          <IconClose size={22} />
        </button>
      </div>

      {/* 左右导航 */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate('prev'); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
        disabled={currentIndex === 0}
        title="上一个 (←)"
      >
        <IconChevronLeft size={26} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); navigate('next'); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
        disabled={currentIndex === allItems.length - 1}
        title="下一个 (→)"
      >
        <IconChevronRight size={26} />
      </button>

      {/* 底部工具栏(仅图片) */}
      {!isVideo && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setScale((s) => Math.max(1, s - 0.25))}
            className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            title="缩小"
          >
            <IconZoomOut size={18} />
          </button>
          <span className="min-w-[3rem] text-center text-xs tabular-nums text-white/90">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(5, s + 0.25))}
            className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            title="放大"
          >
            <IconZoomIn size={18} />
          </button>
          <button
            onClick={() => { setScale(1); }}
            className="ml-1 rounded-full px-3 py-1 text-xs text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            title="重置 (双击图片也可切换)"
          >
            重置
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState } from '../../store';
import { formatBytes } from '../../lib/utils';
import { ConfirmDialog } from '../ui/dialog';
import type { TrashItem } from '../../../../shared/types';

// 回收站保留天数(30 天后自动彻底删除)
const TRASH_RETENTION_DAYS = 30;

/**
 * 回收站视图 - 设计稿规范:
 * - 顶部警告色提示条(alert-triangle + 30 天后自动彻底删除 + 立即清空)
 * - "已删除项目" 标题 + "还原选中"(主色) / "彻底删除"(浅红底) 胶囊按钮
 * - 4/3 比例缩略图网格,minmax(180px, 1fr),gap 12px
 * - 半透明黑色遮罩(0.25) + 22px 圆形勾选框
 * - 右下角"还有 N 天"黑色半透明徽章
 * - stagger 40ms 入场动画
 */
export default function TrashView() {
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<number[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await window.lumibox.trash.listTrash();
      setItems(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (currentView === 'trash') refresh();
  }, [currentView, refresh]);

  // 切换选中
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  // 还原选中
  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) {
      toast.info('请先选择要还原的项目');
      return;
    }
    try {
      let ok = 0;
      let fail = 0;
      for (const id of selectedIds) {
        try { await window.lumibox.trash.restore(id); ok++; }
        catch { fail++; }
      }
      if (ok > 0) toast.success(`已还原 ${ok} 项${fail > 0 ? `,${fail} 项失败` : ''}`);
      setSelectedIds([]);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // 彻底删除选中
  const handlePurgeSelected = () => {
    if (selectedIds.length === 0) {
      toast.info('请先选择要删除的项目');
      return;
    }
    setConfirmPurge(selectedIds);
  };

  const confirmPurgeAction = async () => {
    if (confirmPurge === null) return;
    try {
      let ok = 0;
      let fail = 0;
      for (const id of confirmPurge) {
        try { await window.lumibox.trash.purge(id); ok++; }
        catch { fail++; }
      }
      if (ok > 0) toast.success(`已永久删除 ${ok} 项${fail > 0 ? `,${fail} 项失败` : ''}`);
      setConfirmPurge(null);
      setSelectedIds([]);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleEmpty = async () => {
    setConfirmEmpty(false);
    try {
      await window.lumibox.trash.emptyTrash();
      toast.success('回收站已清空');
      setSelectedIds([]);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (currentView !== 'trash') return null;

  return (
    <div className="h-full overflow-auto bg-background animate-fade-in">
      <div className="p-6">
        {/* 顶部警告色提示条:30 天自动彻底删除 */}
        <div
          className="mb-5 flex items-center gap-3 rounded-lg px-4 py-3"
          style={{
            background: 'rgba(255, 149, 0, 0.08)',
            border: '1px solid rgba(255, 149, 0, 0.2)'
          }}
        >
          {/* 警告图标(20px 警告色) */}
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="var(--chart-3, #ff9500)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="shrink-0"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <span className="flex-1 min-w-0 text-[13px] font-normal text-foreground">
            回收站中的项目将在 30 天后自动彻底删除。
          </span>
          <button
            onClick={() => setConfirmEmpty(true)}
            disabled={items.length === 0}
            className="shrink-0 whitespace-nowrap rounded-full text-[13px] font-medium text-destructive spring-transition transition-colors hover:text-destructive/80 disabled:opacity-40 disabled:pointer-events-none"
          >
            立即清空
          </button>
        </div>

        {/* 顶部工具栏:标题 + 还原/彻底删除按钮 */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 shrink-0 min-w-0">
            <h2 className="text-[15px] font-semibold text-foreground">已删除项目</h2>
            <span className="text-[13px] text-muted-fg shrink-0">
              {items.length} 项{selectedIds.length > 0 && ` · 已选 ${selectedIds.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* 还原选中(主色填充) */}
            <button
              onClick={handleRestoreSelected}
              disabled={selectedIds.length === 0}
              className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground spring-transition transition-all hover:bg-primary/90 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v6h6" />
                <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
              </svg>
              <span className="whitespace-nowrap">还原选中</span>
            </button>
            {/* 彻底删除(浅红底 + 红字) */}
            <button
              onClick={handlePurgeSelected}
              disabled={selectedIds.length === 0}
              className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-destructive spring-transition transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: 'rgba(255, 59, 48, 0.08)' }}
              onMouseEnter={(e) => { if (selectedIds.length > 0) e.currentTarget.style.background = 'rgba(255, 59, 48, 0.14)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span className="whitespace-nowrap">彻底删除</span>
            </button>
          </div>
        </div>

        {/* 网格 / 空状态 */}
        {items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-fg animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <p className="text-sm">回收站为空</p>
            <p className="text-xs">删除的图片会暂存在这里,30 天内可恢复</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {items.map((item, idx) => (
              <TrashThumb
                key={item.id}
                item={item}
                index={idx}
                selected={selectedIds.includes(item.id)}
                onToggle={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmEmpty}
        title="清空回收站"
        description="此操作不可恢复,确定清空所有回收站内容?"
        confirmText="清空"
        variant="danger"
        onConfirm={handleEmpty}
        onCancel={() => setConfirmEmpty(false)}
      />

      <ConfirmDialog
        open={confirmPurge !== null}
        title="彻底删除"
        description={`此操作不可恢复,确定永久删除选中的 ${confirmPurge?.length ?? 0} 项?`}
        confirmText="删除"
        variant="danger"
        onConfirm={confirmPurgeAction}
        onCancel={() => setConfirmPurge(null)}
      />
    </div>
  );
}

// ============ 单个缩略图卡片 ============
interface TrashThumbProps {
  item: TrashItem;
  index: number;
  selected: boolean;
  onToggle: () => void;
}

function TrashThumb({ item, index, selected, onToggle }: TrashThumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const cancelledRef = useRef(false);
  const retryCountRef = useRef(0);

  // 懒加载缩略图:仅在卡片进入视口时请求
  // 回收站项目的 images 表记录已被删除,用 trashId 走 lumibox://trash-thumb/<trashId> 协议
  useEffect(() => {
    cancelledRef.current = false;
    const el = ref.current;
    if (!el) return;

    // 请求缩略图(带重试,最多 2 次)
    const requestThumb = (attempt: number) => {
      if (cancelledRef.current) return;
      setLoaded(false);
      // 直接用协议 URL,浏览器 <img> 会自动请求
      const url = `lumibox://trash-thumb/${item.id}`;
      setThumbUrl(url);
      // 加载状态由 <img> 的 onLoad/onError 回调控制
      void attempt; // 重试由 onError 中重新设置 src 触发
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
  }, [item.id]);

  // 计算剩余天数
  const remainingDays = Math.max(0, TRASH_RETENTION_DAYS - Math.floor((Date.now() - item.trashedAt) / (1000 * 60 * 60 * 24)));

  // 判断是否视频(根据扩展名)
  const ext = item.trashName.toLowerCase().split('.').pop() ?? '';
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts', '3gp'].includes(ext);

  return (
    <div
      ref={ref}
      onClick={onToggle}
      className="trash-thumb group relative cursor-pointer overflow-hidden rounded-lg bg-muted animate-fade-in-up spring-transition"
      style={{
        aspectRatio: '4 / 3',
        border: `2px solid ${selected ? 'var(--primary)' : 'transparent'}`,
        animationDelay: `${Math.min(index, 30) * 40}ms`
      }}
    >
      {/* 缩略图:直接用协议 URL,浏览器自动请求;失败时重试 */}
      {thumbUrl && !failed && (
        <img
          src={thumbUrl}
          alt={item.trashName}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
          onLoad={() => { if (!cancelledRef.current) setLoaded(true); }}
          onError={() => {
            if (cancelledRef.current) return;
            // 失败重试:重新设置 src(加时间戳避免浏览器缓存 404)
            const retrySrc = `lumibox://trash-thumb/${item.id}?retry=${Date.now()}`;
            if (retryCountRef.current < 2) {
              retryCountRef.current++;
              setThumbUrl(retrySrc);
            } else {
              setFailed(true);
              setLoaded(true);
            }
          }}
        />
      )}

      {/* 加载中 / 失败占位 */}
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-black/5 to-transparent bg-[length:200%_100%]" />
      )}
      {failed && (
        <div className="flex h-full w-full items-center justify-center">
          {isVideo ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m10 9 5 3-5 3z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          )}
        </div>
      )}

      {/* 半透明黑色遮罩(0.25,hover 时变浅至 0.1) */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{ background: 'rgba(0, 0, 0, 0.25)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)'; }}
      />

      {/* 左上角 22px 圆形勾选框 */}
      <div
        className="absolute left-2.5 top-2.5 flex h-[22px] w-[22px] items-center justify-center rounded-full transition-all duration-200"
        style={{
          border: `1.5px solid ${selected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.9)'}`,
          background: selected ? 'var(--primary)' : 'transparent'
        }}
      >
        {selected && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-pop-in">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>

      {/* 右下角"还有 N 天"徽章 */}
      <span
        className="absolute bottom-2.5 right-2.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      >
        还有 {remainingDays} 天
      </span>

      {/* hover 时显示文件名 + 大小 */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {item.trashName} · {formatBytes(item.size)}
      </div>
    </div>
  );
}

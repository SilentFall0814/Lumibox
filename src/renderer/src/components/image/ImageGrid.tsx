import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setImages, appendImages, removeImages, setLoading } from '../../store/imagesSlice';
import { clearSelection, toggleSelect } from '../../store/selectionSlice';
import { setFullscreenImage, setMultiSelectMode } from '../../store/uiSlice';
import type { ImageRecord } from '../../../../shared/types';
import { ImageCard, useLazyThumbnail } from './ImageCard';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useKeyboard } from '../../hooks/useKeyboard';
import { ConfirmDialog } from '../ui/dialog';
import { formatBytes, formatDate, formatDuration } from '../../lib/utils';

/**
 * 图片网格 / 列表 - 设计稿规范:
 * - 网格:CSS Grid repeat(auto-fill, minmax(180px, 1fr)) gap 12px,4/3 比例
 * - 列表:横向行(80px 缩略图 + 名称 + 时间 + 大小 + 类型)
 * - 日期分组(2026年7月/2026年6月),左侧 3px 蓝色竖条分组标签
 * - hover scale 1.02 + 阴影增强
 * - stagger 40ms 入场
 * - 多选模式:底部浮动操作栏(毛玻璃胶囊,从下滑入)
 * - 排序:newest/oldest/name/size(由 TopBar 控制,通过 store 传入)
 *
 * 性能优化:
 * - groupedItems 用 Map 直接 push,避免 find O(n²)
 * - stagger 索引按 group 内累计计算,不再用 displayItems.indexOf
 * - selectedObjs 只在多选浮动栏显示时计算
 */
export default function ImageGrid() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((s: RootState) => s.images.items);
  const hasMore = useSelector((s: RootState) => s.images.hasMore);
  const page = useSelector((s: RootState) => s.images.page);
  const currentPath = useSelector((s: RootState) => s.ui.currentPath);
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const searchResults = useSelector((s: RootState) => s.images.searchResults);
  const selectedIds = useSelector((s: RootState) => s.selection.selectedIds);
  const reloadNonce = useSelector((s: RootState) => s.ui.reloadNonce);
  const multiSelectMode = useSelector((s: RootState) => s.ui.multiSelectMode);
  const sortKey = useSelector((s: RootState) => s.ui.sortKey);
  const viewMode = useSelector((s: RootState) => s.ui.viewMode);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayItems: ImageRecord[] = searchResults ?? items;
  const { handleSelect, handleClear, selectAll } = useMultiSelect(displayItems);

  // 加载图片列表
  const loadImages = useCallback(async (path: string, pageNum: number, append: boolean) => {
    if (!append) dispatch(setLoading(true));
    else setLoadingMore(true);
    try {
      const result = await window.lumibox.image.listByDir(path, pageNum);
      if (append) {
        dispatch(appendImages({ items: result.items, page: result.page, hasMore: result.hasMore }));
      } else {
        dispatch(setImages({ items: result.items, total: result.total, page: result.page, hasMore: result.hasMore }));
        dispatch(clearSelection());
      }
    } catch (e) {
      toast.error('加载图片失败: ' + (e as Error).message);
    } finally {
      dispatch(setLoading(false));
      setLoadingMore(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (currentView === 'search' || currentView === 'trash') return;
    loadImages(currentPath, 1, false);
  }, [currentPath, currentView, loadImages]);

  useEffect(() => {
    if (reloadNonce === 0) return;
    if (currentView === 'search' || currentView === 'trash') return;
    loadImages(currentPath, 1, false);
  }, [reloadNonce, currentPath, currentView, loadImages]);

  // 监听主进程文件变化通知,防抖后重新加载
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (currentView === 'search' || currentView === 'trash') return;
    const unsubscribe = window.lumibox.scan.onImageChanged(() => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        loadImages(currentPath, 1, false);
      }, 300);
    });
    return () => {
      unsubscribe();
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [currentPath, currentView, loadImages]);

  // 拖拽导入
  const handleDrop = useCallback(async (paths: string[], mode: 'move' | 'copy') => {
    try {
      const result = await window.lumibox.image.importExternal(paths, mode, currentPath);
      if (result.moved > 0) {
        toast.success(`${mode === 'move' ? '导入' : '复制'}了 ${result.moved} 张图片到当前目录`);
        loadImages(currentPath, 1, false);
      }
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} 张失败`);
      }
    } catch (e) {
      toast.error(String(e));
    }
  }, [currentPath, loadImages]);

  const { state: dragState, handlers: dragHandlers } = useDragDrop(handleDrop);

  const handleCardDragStart = useCallback((image: ImageRecord) => (e: React.DragEvent) => {
    const ids = selectedIds.includes(image.id) && selectedIds.length > 0
      ? selectedIds
      : [image.id];
    e.dataTransfer.setData('application/x-lumibox-images', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedIds]);

  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setConfirmDelete(true);
  }, [selectedIds]);

  const confirmDeleteAction = useCallback(async () => {
    setConfirmDelete(false);
    try {
      const result = await window.lumibox.image.deleteMany(selectedIds);
      await window.lumibox.undo.pushUndo({
        type: 'delete',
        data: { trashIds: result.trashIds }
      });
      dispatch(removeImages(selectedIds));
      dispatch(clearSelection());
      toast.success(`已删除 ${result.deleted} 张,可从回收站恢复`);
    } catch (e) {
      toast.error('删除失败: ' + (e as Error).message);
    }
  }, [selectedIds, dispatch]);

  useKeyboard({
    onDelete: handleDelete,
    onUndo: async () => {
      const r = await window.lumibox.undo.undo();
      if (r.ok) {
        toast.success('已撤销操作');
        loadImages(currentPath, 1, false);
      }
    },
    onSelectAll: () => selectAll(displayItems.map((i) => i.id)),
    onEscape: () => dispatch(clearSelection())
  });

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadImages(currentPath, page + 1, true);
  }, [hasMore, loadingMore, page, currentPath, loadImages]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMore();
    }
  }, [loadMore]);

  // ============ 排序后的展示列表(避免在分组时再排序)============
  const sortedItems = useMemo(() => {
    const arr = displayItems.slice();
    switch (sortKey) {
      case 'newest':
        arr.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        arr.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'name':
        arr.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        break;
      case 'size':
        arr.sort((a, b) => b.size - a.size);
        break;
    }
    return arr;
  }, [displayItems, sortKey]);

  // ============ 按年月分组(已排序,直接顺序遍历即可)============
  // 性能:用 Map 直接 push,不再用 groups.find O(n²)
  const groupedItems = useMemo(() => {
    const groups: { key: string; label: string; items: ImageRecord[] }[] = [];
    const map = new Map<string, { key: string; label: string; items: ImageRecord[] }>();
    for (const it of sortedItems) {
      const d = new Date(it.createdAt);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      let g = map.get(key);
      if (!g) {
        g = { key, label: `${year}年${month}月`, items: [] };
        map.set(key, g);
        groups.push(g);
      }
      g.items.push(it);
    }
    return groups;
  }, [sortedItems]);

  if (currentView === 'trash') return null;

  return (
    <div
      className="relative h-full overflow-auto"
      onScroll={handleScroll}
      onClick={(e) => { if (e.target === e.currentTarget) handleClear(); }}
      {...dragHandlers}
    >
      {/* 多选模式顶部提示条(蓝色) */}
      {multiSelectMode && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-primary/30 bg-primary-bg/95 px-5 py-2.5 backdrop-blur-md animate-slide-in-bottom">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => dispatch(setMultiSelectMode(false))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
              title="返回"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[13px] font-medium text-primary">
              已选择 {selectedIds.length} 项
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => selectAll(displayItems.map((i) => i.id))}
              className="rounded-full px-3 py-1 text-[12px] text-primary transition-colors hover:bg-primary/10"
            >
              全选
            </button>
            <div className="mx-1 h-3 w-px bg-primary/20" />
            <button
              onClick={() => dispatch(clearSelection())}
              className="rounded-full px-3 py-1 text-[12px] text-primary/80 transition-colors hover:bg-primary/10"
            >
              清空
            </button>
          </div>
        </div>
      )}

      {/* 拖拽导入高亮 */}
      {dragState.isOver && (
        <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-lg drop-zone-active">
          <p className="text-lg font-medium text-primary">
            {dragState.isCtrl ? '复制到照片库' : '移动到照片库'}
          </p>
        </div>
      )}

      {displayItems.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-fg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <p className="text-sm">暂无图片</p>
          <p className="text-xs">将图片文件拖入窗口即可导入</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ============ 网格视图 ============ */
        <div className="p-5">
          {groupedItems.map((group) => {
            // 累计 stagger 索引,避免每张卡 O(n) 查找 indexOf
            let runningIndex = 0;
            return (
              <section key={group.key} className="mb-6">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="h-4 w-[3px] rounded-r-full bg-primary" />
                  <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                  <span className="text-xs text-muted-fg tabular-nums">{group.items.length} 项</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                  {group.items.map((img) => {
                    const idx = runningIndex++;
                    return (
                      <ImageCard
                        key={img.id}
                        image={img}
                        selected={selectedIds.includes(img.id)}
                        index={idx}
                        onClick={(e) => {
                          if (multiSelectMode) {
                            dispatch(toggleSelect(img.id));
                          } else {
                            handleSelect(img, e);
                          }
                        }}
                        onDoubleClick={async () => {
                          if (multiSelectMode) return;
                          await window.lumibox.viewer.openFullscreen(img.id);
                          dispatch(setFullscreenImage(img.id));
                        }}
                        onDragStart={handleCardDragStart(img)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* ============ 列表视图 ============ */
        <div className="p-5">
          {groupedItems.map((group) => (
            <section key={group.key} className="mb-6">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-4 w-[3px] rounded-r-full bg-primary" />
                <h2 className="text-[15px] font-semibold text-foreground">{group.label}</h2>
                <span className="text-xs text-muted-fg tabular-nums">{group.items.length} 项</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {group.items.map((img) => (
                  <ImageRow
                    key={img.id}
                    image={img}
                    selected={selectedIds.includes(img.id)}
                    onClick={(e) => {
                      if (multiSelectMode) {
                        dispatch(toggleSelect(img.id));
                      } else {
                        handleSelect(img, e);
                      }
                    }}
                    onDoubleClick={async () => {
                      if (multiSelectMode) return;
                      await window.lumibox.viewer.openFullscreen(img.id);
                      dispatch(setFullscreenImage(img.id));
                    }}
                    onDragStart={handleCardDragStart(img)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}

      {/* ============ 多选模式底部浮动操作栏 ============ */}
      {multiSelectMode && selectedIds.length > 0 && (
        <div className="sticky bottom-5 left-1/2 z-30 -translate-x-1/2 animate-slide-in-bottom">
          <div className="flex items-center gap-1 rounded-full glass glass-edge shadow-2xl p-1.5">
            {/* 加入相册 */}
            <FloatingActionBtn
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M12 11v6M9 14h6" />
                </svg>
              }
              label="加入相册"
            />
            {/* 导出 */}
            <FloatingActionBtn
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              }
              label="导出"
            />
            {/* 分享 */}
            <FloatingActionBtn
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
              }
              label="分享"
            />
            {/* 删除 - 危险色 */}
            <FloatingActionBtn
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              }
              label="删除"
              variant="danger"
              onClick={handleDelete}
            />
            <div className="mx-0.5 h-6 w-px bg-border/60" />
            {/* 取消按钮 */}
            <button
              onClick={() => {
                dispatch(setMultiSelectMode(false));
                dispatch(clearSelection());
              }}
              className="flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-medium text-foreground transition-all duration-200 ease-spring hover:bg-muted active:scale-95"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="确认删除"
        description={`确定将 ${selectedIds.length} 项移到回收站?可从回收站恢复,或按 Ctrl+Z 撤销。`}
        confirmText="删除"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ============ 列表视图单行 ============
interface ImageRowProps {
  image: ImageRecord;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function ImageRow({ image, selected, onClick, onDoubleClick, onDragStart }: ImageRowProps) {
  return (
    <div
      className={`group relative flex items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-all duration-200 ease-spring cursor-pointer hover:bg-muted/60 ${
        selected ? 'border-primary ring-1 ring-primary/30' : 'border-border/60'
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onDragStart={onDragStart}
      draggable
    >
      {/* 选中态勾选框 */}
      {selected && (
        <div className="absolute left-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full check-circle text-white animate-pop-in">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      )}
      {/* 缩略图(80×60,4/3 比例) */}
      <div className="relative h-[60px] w-[80px] flex-shrink-0 overflow-hidden rounded-md bg-muted">
        <RowThumb image={image} />
      </div>
      {/* 名称 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground" title={image.name}>{image.name}</p>
        <p className="truncate text-[11px] text-muted-fg tabular-nums">
          {formatDate(image.createdAt)}
        </p>
      </div>
      {/* 类型徽章 */}
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-fg">
        {image.type === 'video' ? '视频' : '图片'}
      </span>
      {/* 视频时长 */}
      {image.type === 'video' && image.duration != null && (
        <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] tabular-nums text-foreground/70 dark:bg-white/10">
          {formatDuration(image.duration)}
        </span>
      )}
      {/* 大小 */}
      <span className="shrink-0 w-[80px] text-right text-[12px] tabular-nums text-muted-fg">
        {formatBytes(image.size)}
      </span>
    </div>
  );
}

// 行缩略图(懒加载,复用 ImageCard 的 hook 逻辑)
function RowThumb({ image }: { image: ImageRecord }) {
  const { ref, src, loading, error } = useLazyThumbnail(image);
  return (
    <div ref={ref} className="h-full w-full">
      {src ? (
        <img src={src} alt={image.name} className="h-full w-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {loading ? (
            <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-black/5 to-transparent bg-[length:200%_100%]" />
          ) : error ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          ) : image.type === 'video' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
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
    </div>
  );
}

/** 浮动操作栏按钮 */
function FloatingActionBtn({
  icon, label, variant = 'default', onClick
}: {
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger';
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all duration-200 ease-spring active:scale-95 ${
        variant === 'danger'
          ? 'text-danger hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

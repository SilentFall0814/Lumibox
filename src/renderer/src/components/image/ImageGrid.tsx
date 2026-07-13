import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setImages, appendImages, removeImages, setLoading } from '../../store/imagesSlice';
import { clearSelection } from '../../store/selectionSlice';
import { setFullscreenImage } from '../../store/uiSlice';
import type { ImageRecord } from '../../../../shared/types';
import { ImageCard } from './ImageCard';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useKeyboard } from '../../hooks/useKeyboard';
import { ConfirmDialog } from '../ui/dialog';

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
    // 搜索模式不加载目录
    if (currentView === 'search' || currentView === 'trash') return;
    loadImages(currentPath, 1, false);
  }, [currentPath, currentView, loadImages]);

  // 跨组件重载信号(如把图片拖到相册后,源目录需移除这些图片)
  // reloadNonce 变化时重新加载当前目录
  useEffect(() => {
    if (reloadNonce === 0) return; // 跳过初始值
    if (currentView === 'search' || currentView === 'trash') return;
    loadImages(currentPath, 1, false);
  }, [reloadNonce, currentPath, currentView, loadImages]);

  // 监听主进程文件变化通知(add/unlink/change),防抖后重新加载当前目录
  // 注意:currentView 为 search/trash 时不响应该事件,避免干扰
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (currentView === 'search' || currentView === 'trash') return;
    const unsubscribe = window.lumibox.scan.onImageChanged(() => {
      // 防抖:短时间内的多次文件变化合并为一次刷新
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

  // 拖拽导入:导入到当前所在目录(相册或库根)
  const handleDrop = useCallback(async (paths: string[], mode: 'move' | 'copy') => {
    try {
      const result = await window.lumibox.image.importExternal(paths, mode, currentPath);
      if (result.moved > 0) {
        toast.success(`${mode === 'move' ? '导入' : '复制'}了 ${result.moved} 张图片到当前目录`);
        // 重新加载
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

  // 卡片拖拽到相册:若被拖卡片已选中,则一起移动所有选中项;否则仅移动该卡片
  const handleCardDragStart = useCallback((image: ImageRecord) => (e: React.DragEvent) => {
    const ids = selectedIds.includes(image.id) && selectedIds.length > 0
      ? selectedIds
      : [image.id];
    e.dataTransfer.setData('application/x-lumibox-images', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedIds]);

  // 删除选中
  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setConfirmDelete(true);
  }, [selectedIds]);

  const confirmDeleteAction = useCallback(async () => {
    setConfirmDelete(false);
    try {
      const result = await window.lumibox.image.deleteMany(selectedIds);
      // 推入撤销栈
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

  // 键盘
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

  // 加载更多
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadImages(currentPath, page + 1, true);
  }, [hasMore, loadingMore, page, currentPath, loadImages]);

  // 滚动监听
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadMore();
    }
  }, [loadMore]);

  if (currentView === 'trash') return null;

  return (
    <div
      className="relative h-full overflow-auto"
      onScroll={handleScroll}
      onClick={(e) => { if (e.target === e.currentTarget) handleClear(); }}
      {...dragHandlers}
    >
      {dragState.isOver && (
        <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-lg drop-zone-active">
          <p className="text-lg font-medium text-primary">
            {dragState.isCtrl ? '复制到照片库' : '移动到照片库'}
          </p>
        </div>
      )}

      {displayItems.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-fg">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <p className="text-sm">暂无图片</p>
          <p className="text-xs">将图片文件拖入窗口即可导入</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 p-4">
          {displayItems.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              selected={selectedIds.includes(img.id)}
              onClick={(e) => handleSelect(img, e)}
              onDoubleClick={async () => {
                await window.lumibox.viewer.openFullscreen(img.id);
                dispatch(setFullscreenImage(img.id));
              }}
              onDragStart={handleCardDragStart(img)}
            />
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="确认删除"
        description={`确定将 ${selectedIds.length} 张图片移到回收站?可从回收站恢复,或按 Ctrl+Z 撤销。`}
        confirmText="删除"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

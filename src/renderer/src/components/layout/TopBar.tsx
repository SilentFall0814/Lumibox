import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setSearchQuery, toggleFilterPanel, setView, setFullscreenImage } from '../../store/uiSlice';
import { setSearchResults } from '../../store/imagesSlice';
import { Button } from '../ui/button';

export default function TopBar() {
  const dispatch = useDispatch<AppDispatch>();
  const currentPath = useSelector((s: RootState) => s.ui.currentPath);
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const searchQuery = useSelector((s: RootState) => s.ui.searchQuery);
  const scanProgress = useSelector((s: RootState) => s.ui.scanProgress);
  const selectedCount = useSelector((s: RootState) => s.selection.selectedIds.length);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await window.lumibox.search.byName(searchQuery.trim());
      dispatch(setSearchResults(results));
      dispatch(setView('search'));
    } catch (err) {
      toast.error('搜索失败: ' + (err as Error).message);
    }
  };

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <path d="M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <span className="text-sm font-semibold text-foreground">拾光盒</span>
      </div>

      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <svg className="absolute left-2.5 top-2.5 text-muted-fg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="搜索图片名称…"
            className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary focus:bg-background"
          />
        </div>
      </form>

      {/* 当前路径 */}
      <div className="flex-1 truncate text-xs text-muted-fg">
        {currentView === 'search' ? '搜索结果' :
         currentView === 'trash' ? '回收站' :
         currentPath || '全部图片'}
      </div>

      {/* 扫描进度 */}
      {scanProgress && scanProgress.total > 0 && scanProgress.current < scanProgress.total && (
        <span className="text-xs text-muted-fg">
          索引中 {scanProgress.current}/{scanProgress.total}
        </span>
      )}

      {/* 选中计数 */}
      {selectedCount > 0 && (
        <span className="rounded bg-primary-bg px-2 py-0.5 text-xs text-primary">
          已选 {selectedCount}
        </span>
      )}

      {/* 筛选按钮 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => dispatch(toggleFilterPanel())}
        title="筛选"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
      </Button>
    </header>
  );
}

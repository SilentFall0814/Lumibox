import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import {
  setSearchQuery, setView,
  setMultiSelectMode, setTheme,
  setSortKey, setViewMode
} from '../../store/uiSlice';
import { setSearchResults } from '../../store/imagesSlice';
import { clearSelection } from '../../store/selectionSlice';
import type { ThemeMode, SortKey, ViewMode } from '../../store/uiSlice';
import { cn } from '../../lib/utils';

/**
 * 顶栏 - 设计稿规范:
 * - 52px 高,毛玻璃背景
 * - 左:标题 + 计数(3,128 项)
 * - 中:280px×36px 搜索框
 * - 右:排序/视图/多选/主题/关于 36px 圆形按钮组
 * - 底部 1px 渐变线
 */

// ============ 图标组件(36px 圆形按钮内 18px 图标)============
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const IconSort = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M6 12h12M10 18h4" />
  </svg>
);
const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </svg>
);
const IconCheckSquare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);
const IconMoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const IconMonitor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// 排序选项
const SORT_OPTIONS = [
  { key: 'newest', label: '最新优先' },
  { key: 'oldest', label: '最旧优先' },
  { key: 'name', label: '按名称' },
  { key: 'size', label: '按大小' }
] as const;

// 视图选项
const VIEW_OPTIONS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: 'grid', label: '网格视图', icon: <IconGrid /> },
  { key: 'list', label: '列表视图', icon: <IconList /> }
];

export default function TopBar() {
  const dispatch = useDispatch<AppDispatch>();
  const currentPath = useSelector((s: RootState) => s.ui.currentPath);
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const selectedAlbum = useSelector((s: RootState) => s.ui.selectedAlbum);
  const searchQuery = useSelector((s: RootState) => s.ui.searchQuery);
  const scanProgress = useSelector((s: RootState) => s.ui.scanProgress);
  const multiSelectMode = useSelector((s: RootState) => s.ui.multiSelectMode);
  const theme = useSelector((s: RootState) => s.ui.theme);
  const items = useSelector((s: RootState) => s.images.items);
  const searchResults = useSelector((s: RootState) => s.images.searchResults);
  const folders = useSelector((s: RootState) => s.albums.folders);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  // 排序与视图模式改为全局状态(从 store 读写,ImageGrid 读取生效)
  const sortKey = useSelector((s: RootState) => s.ui.sortKey);
  const viewMode = useSelector((s: RootState) => s.ui.viewMode);

  const allItems = searchResults ?? items;

  // 当前标题与计数
  const headerTitle = (() => {
    if (currentView === 'search') return '搜索结果';
    if (currentView === 'trash') return '回收站';
    if (currentView === 'album' && selectedAlbum) {
      const album = folders.find((f) => f.path === selectedAlbum);
      return album?.name ?? '相册';
    }
    return '全部图片';
  })();
  const headerCount = allItems.length;

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

  const toggleMultiSelect = () => {
    const next = !multiSelectMode;
    dispatch(setMultiSelectMode(next));
    if (!next) dispatch(clearSelection());
  };

  const changeTheme = (t: ThemeMode) => {
    dispatch(setTheme(t));
    setThemeMenuOpen(false);
  };

  const changeSort = (k: SortKey) => {
    dispatch(setSortKey(k));
    setSortMenuOpen(false);
  };

  const changeView = (m: ViewMode) => {
    dispatch(setViewMode(m));
    setViewMenuOpen(false);
  };

  return (
    <header className="relative z-30 flex h-[52px] flex-shrink-0 items-center gap-3 px-5 glass edge-bottom animate-fade-in">
      {/* ============ 标题 + 计数 ============ */}
      <div className="flex flex-shrink-0 items-baseline gap-2">
        <h1 className="text-[15px] font-semibold text-foreground">{headerTitle}</h1>
        <span className="text-xs text-muted-fg tabular-nums">
          {headerCount.toLocaleString()} 项
        </span>
      </div>

      {/* ============ 搜索框 (280px×36px) ============ */}
      <form onSubmit={handleSearch} className="ml-2 flex-shrink-0">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg">
            <IconSearch />
          </span>
          <input
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="搜索图片名称…"
            className="w-[280px] h-9 rounded-full border border-border/60 bg-black/[0.03] dark:bg-white/[0.06] pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-fg outline-none focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </form>

      {/* 弹性间距 */}
      <div className="flex-1" />

      {/* 扫描进度 */}
      {scanProgress && scanProgress.total > 0 && scanProgress.current < scanProgress.total && (
        <span className="text-xs text-muted-fg animate-fade-in tabular-nums">
          索引中 {scanProgress.current}/{scanProgress.total}
        </span>
      )}

      {/* ============ 工具按钮组(36px 圆形)============ */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {/* 排序按钮 + 下拉 */}
        <div className="relative">
          <button
            onClick={() => { setSortMenuOpen((v) => !v); setThemeMenuOpen(false); setViewMenuOpen(false); }}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-spring',
              'text-muted-fg hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]',
              sortMenuOpen && 'bg-black/[0.05] text-foreground dark:bg-white/[0.08]'
            )}
            title="排序"
          >
            <IconSort />
          </button>
          {sortMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] animate-scale-in rounded-xl border border-border/60 glass glass-edge py-1.5 shadow-xl">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => changeSort(opt.key)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                      sortKey === opt.key ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    <span>{opt.label}</span>
                    {sortKey === opt.key && <IconCheck />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 视图切换按钮 + 下拉(网格 / 列表) */}
        <div className="relative">
          <button
            onClick={() => { setViewMenuOpen((v) => !v); setThemeMenuOpen(false); setSortMenuOpen(false); }}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-spring',
              'text-muted-fg hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]',
              viewMenuOpen && 'bg-black/[0.05] text-foreground dark:bg-white/[0.08]'
            )}
            title={viewMode === 'grid' ? '网格视图' : '列表视图'}
          >
            {viewMode === 'grid' ? <IconGrid /> : <IconList />}
          </button>
          {viewMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setViewMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] animate-scale-in rounded-xl border border-border/60 glass glass-edge py-1.5 shadow-xl">
                {VIEW_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => changeView(opt.key)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                      viewMode === opt.key ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </span>
                    {viewMode === opt.key && <IconCheck />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 多选按钮 - active 态蓝色填充 */}
        <button
          onClick={toggleMultiSelect}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-spring',
            multiSelectMode
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-fg hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]'
          )}
          title={multiSelectMode ? '退出多选' : '多选模式'}
        >
          <IconCheckSquare />
        </button>

        {/* 主题切换 + 下拉 */}
        <div className="relative">
          <button
            onClick={() => { setThemeMenuOpen((v) => !v); setSortMenuOpen(false); setViewMenuOpen(false); }}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-spring',
              'text-muted-fg hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]',
              themeMenuOpen && 'bg-black/[0.05] text-foreground dark:bg-white/[0.08]'
            )}
            title="主题"
          >
            {theme === 'light' ? <IconSun /> :
             theme === 'dark' ? <IconMoon /> : <IconMonitor />}
          </button>
          {themeMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] animate-scale-in rounded-xl border border-border/60 glass glass-edge py-1.5 shadow-xl">
                {([
                  { key: 'light', label: '浅色', icon: <IconSun /> },
                  { key: 'dark', label: '深色', icon: <IconMoon /> },
                  { key: 'auto', label: '跟随系统', icon: <IconMonitor /> }
                ] as { key: ThemeMode; label: string; icon: React.ReactNode }[]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => changeTheme(opt.key)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-1.5 text-[13px] text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                      theme === opt.key ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </span>
                    {theme === opt.key && <IconCheck />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 关于按钮 */}
        <button
          onClick={() => dispatch(setView('about'))}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-spring',
            currentView === 'about'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-fg hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.08]'
          )}
          title="关于"
        >
          <IconInfo />
        </button>
      </div>
    </header>
  );
}

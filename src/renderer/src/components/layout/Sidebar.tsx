import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { setView, setCurrentPath, setSelectedAlbum } from '../../store/uiSlice';
import { clearSelection } from '../../store/selectionSlice';
import { setSearchResults } from '../../store/imagesSlice';
import AlbumList from '../album/AlbumList';
import { cn } from '../../lib/utils';
import logoUrl from '../../assets/logo.png';

/**
 * 侧栏 - 设计稿规范:
 * - 220px 宽,毛玻璃背景
 * - 顶部品牌区(56px 高,28px logo + "拾光盒")
 * - 导航区(全部图片 / 相册列表 / 回收站)
 * - active 态:3px 蓝色左竖条 + 蓝色文字
 * - 右边缘渐变线
 */
export default function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const selectedAlbum = useSelector((s: RootState) => s.ui.selectedAlbum);

  const showAllImages = () => {
    dispatch(setView('library'));
    dispatch(setCurrentPath(''));
    dispatch(setSelectedAlbum(null));
    dispatch(clearSelection());
    dispatch(setSearchResults(null));
  };

  const showTrash = () => {
    dispatch(setView('trash'));
    // 清空相册选中状态,避免相册项与回收站同时高亮
    dispatch(setSelectedAlbum(null));
    dispatch(setCurrentPath(''));
    dispatch(clearSelection());
    dispatch(setSearchResults(null));
  };

  return (
    <aside className="relative z-20 flex w-[220px] flex-shrink-0 flex-col glass edge-right animate-slide-in-right">
      {/* ============ 品牌区(56px 高)============ */}
      <div className="flex h-14 items-center gap-2.5 px-5 flex-shrink-0">
        <img
          src={logoUrl}
          alt="Lumibox"
          className="h-7 w-7 rounded-lg object-cover"
          draggable={false}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold text-foreground">拾光盒</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-fg">
            Lumibox
          </span>
        </div>
      </div>

      {/* ============ 导航区 ============ */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {/* 全部图片 */}
        <NavItem
          label="全部图片"
          active={currentView === 'library' && !selectedAlbum}
          onClick={showAllImages}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          }
        />

        {/* 相册分组 */}
        <div className="mt-4">
          <AlbumList />
        </div>

        {/* 回收站 */}
        <div className="mt-4">
          <NavItem
            label="回收站"
            active={currentView === 'trash'}
            onClick={showTrash}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            }
          />
        </div>
      </nav>
    </aside>
  );
}

/** 侧栏导航项 - Apple 风格 active 态:3px 蓝色左竖条 */
function NavItem({
  label, icon, active, onClick
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium',
        'transition-all duration-200 ease-spring',
        'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
        active
          ? 'text-primary bg-primary-bg/60'
          : 'text-foreground/80 hover:text-foreground'
      )}
    >
      {/* active 左竖条 */}
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
          style={{ animation: 'fade-in 0.2s ease-out' }}
        />
      )}
      <span className={cn('flex-shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-fg group-hover:text-foreground')}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

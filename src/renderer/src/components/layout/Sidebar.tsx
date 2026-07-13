import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setView, setCurrentPath, setSelectedAlbum } from '../../store/uiSlice';
import { clearSelection } from '../../store/selectionSlice';
import { setSearchResults } from '../../store/imagesSlice';
import AlbumList from '../album/AlbumList';
import TagFilter from '../tag/TagFilter';

export default function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const currentView = useSelector((s: RootState) => s.ui.currentView);

  const showAllImages = () => {
    dispatch(setView('library'));
    dispatch(setCurrentPath(''));
    dispatch(setSelectedAlbum(null));
    dispatch(clearSelection());
    dispatch(setSearchResults(null));
  };

  const showTrash = () => {
    dispatch(setView('trash'));
    dispatch(clearSelection());
  };

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-background overflow-y-auto">
      {/* 全部图片 */}
      <div className="flex flex-col gap-1 p-2">
        <button
          onClick={showAllImages}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-muted ${
            currentView === 'library' ? 'bg-primary-bg text-primary' : 'text-foreground'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          全部图片
        </button>

        <button
          onClick={showTrash}
          className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-muted ${
            currentView === 'trash' ? 'bg-primary-bg text-primary' : 'text-foreground'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          回收站
        </button>
      </div>

      <div className="h-px bg-border" />

      {/* 相册列表 */}
      <div className="py-2">
        <AlbumList />
      </div>

      <div className="h-px bg-border" />

      {/* 标签筛选 */}
      <div className="py-2">
        <TagFilter />
      </div>
    </aside>
  );
}

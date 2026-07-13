import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setSearchResults } from '../../store/imagesSlice';
import { setView, setSelectedTagId } from '../../store/uiSlice';
import { setTags } from '../../store/tagsSlice';
import { ConfirmDialog } from '../ui/dialog';

export default function TagFilter() {
  const dispatch = useDispatch<AppDispatch>();
  const tags = useSelector((s: RootState) => s.tags.all);
  const selectedTagId = useSelector((s: RootState) => s.ui.selectedTagId);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const t = await window.lumibox.tag.listTags();
      dispatch(setTags(t));
    } catch { /* ignore */ }
  }, [dispatch]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleClick = async (tagId: number) => {
    dispatch(setSelectedTagId(tagId));
    try {
      const results = await window.lumibox.search.byTags([tagId]);
      dispatch(setSearchResults(results));
      dispatch(setView('search'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-fg">标签</span>
      {tags.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-fg">暂无标签</p>
      )}
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => handleClick(tag.id)}
          className={`flex items-center justify-between rounded px-3 py-1.5 text-sm hover:bg-muted ${
            selectedTagId === tag.id ? 'bg-primary-bg text-primary' : 'text-foreground'
          }`}
        >
          <span className="truncate">#{tag.name}</span>
          {tag.count !== undefined && (
            <span className="text-xs text-muted-fg">{tag.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

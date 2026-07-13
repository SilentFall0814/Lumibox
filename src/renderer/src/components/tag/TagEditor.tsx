import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setTagsByImage } from '../../store/tagsSlice';
import { Button } from '../ui/button';

export default function TagEditor() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedIds = useSelector((s: RootState) => s.selection.selectedIds);
  const allTags = useSelector((s: RootState) => s.tags.all);
  const byImage = useSelector((s: RootState) => s.tags.byImage);
  const [newTag, setNewTag] = useState('');

  const imageId = selectedIds[0];
  const currentTags = imageId ? (byImage[imageId] ?? []) : [];

  const refreshTags = async () => {
    if (!imageId) return;
    const tags = await window.lumibox.tag.listTagsByImage(imageId);
    dispatch(setTagsByImage({ imageId, tags }));
  };

  const handleCreate = async () => {
    const name = newTag.trim();
    if (!name) return;
    try {
      await window.lumibox.tag.createTag(name);
      setNewTag('');
      // 刷新全部标签列表
      const refreshAction = { type: 'tags/refresh' };
      dispatch(refreshAction);
      toast.success(`已创建标签 #${name}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAttach = async (tagId: number) => {
    if (!imageId) return;
    try {
      await window.lumibox.tag.attachTag(imageId, tagId);
      refreshTags();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDetach = async (tagId: number) => {
    if (!imageId) return;
    try {
      await window.lumibox.tag.detachTag(imageId, tagId);
      refreshTags();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">标签</span>

      {selectedIds.length === 0 ? (
        <p className="text-xs text-muted-fg">选择图片以编辑标签</p>
      ) : selectedIds.length > 1 ? (
        <p className="text-xs text-muted-fg">已选择 {selectedIds.length} 张,请单选以编辑标签</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {currentTags.length === 0 && (
              <span className="text-xs text-muted-fg">暂无标签</span>
            )}
            {currentTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded bg-primary-bg px-2 py-0.5 text-xs text-primary"
              >
                #{tag.name}
                <button onClick={() => handleDetach(tag.id)} className="hover:text-danger">×</button>
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="新建标签"
              className="flex-1 rounded border border-border px-2 py-1 text-xs outline-none focus:border-primary"
            />
            <Button size="sm" onClick={handleCreate}>添加</Button>
          </div>

          <div className="flex flex-wrap gap-1">
            {allTags
              .filter((t) => !currentTags.some((c) => c.id === t.id))
              .map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAttach(tag.id)}
                  className="rounded border border-border px-2 py-0.5 text-xs text-muted-fg hover:border-primary hover:text-primary"
                >
                  + #{tag.name}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

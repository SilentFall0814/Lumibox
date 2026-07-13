import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { setFolders } from '../../store/albumsSlice';
import { setView, setCurrentPath, setSelectedAlbum, triggerReload } from '../../store/uiSlice';
import { clearSelection } from '../../store/selectionSlice';
import { ConfirmDialog } from '../ui/dialog';
import AlbumItem from './AlbumItem';
import type { Album } from '../../../../shared/types';

export default function AlbumList() {
  const dispatch = useDispatch<AppDispatch>();
  const folders = useSelector((s: RootState) => s.albums.folders);
  const selectedAlbum = useSelector((s: RootState) => s.ui.selectedAlbum);
  const currentPath = useSelector((s: RootState) => s.ui.currentPath);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const albums = await window.lumibox.album.listAlbums();
      dispatch(setFolders(albums));
    } catch {
      // 忽略
    }
  }, [dispatch]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    // 监听相册变化(新增/删除目录),立即刷新
    const unsubscribe = window.lumibox.scan.onAlbumChanged(() => refresh());
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await window.lumibox.album.createAlbum(newName.trim());
      toast.success(`已创建相册"${newName.trim()}"`);
      setNewName('');
      setShowCreate(false);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await window.lumibox.album.removeAlbum(confirmDelete);
      toast.success('相册已移到回收站');
      if (selectedAlbum === confirmDelete) {
        dispatch(setSelectedAlbum(null));
        dispatch(setCurrentPath(''));
        dispatch(setView('library'));
      }
      setConfirmDelete(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleSelectAlbum = (album: Album) => {
    dispatch(setSelectedAlbum(album.path));
    dispatch(setCurrentPath(album.path));
    dispatch(setView('album'));
  };

  const handleDropImages = async (imageIds: number[], albumPath: string) => {
    // 拖到当前所在目录:无意义,直接拦截
    if (albumPath === currentPath) {
      toast.info('图片已经在该相册中');
      return;
    }
    try {
      const result = await window.lumibox.album.moveImagesTo(imageIds, albumPath);
      await window.lumibox.undo.pushUndo({ type: 'move', data: { moves: [] } });
      toast.success(`已移动 ${result.moved} 张到相册`);
      // 清空选中并触发当前目录图片列表重载(源目录应移除这些图片)
      dispatch(clearSelection());
      dispatch(triggerReload());
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">相册</span>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded p-1 text-muted-fg hover:bg-muted hover:text-foreground"
          title="新建相册"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {showCreate && (
        <div className="px-3 pb-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
            }}
            placeholder="相册名称"
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {folders.map((album) => (
        <AlbumItem
          key={album.path}
          album={album}
          selected={selectedAlbum === album.path}
          onSelect={() => handleSelectAlbum(album)}
          onDelete={() => setConfirmDelete(album.path)}
          onDropImages={(ids) => handleDropImages(ids, album.path)}
        />
      ))}

      {folders.length === 0 && !showCreate && (
        <p className="px-3 py-2 text-xs text-muted-fg">暂无相册,点击 + 创建</p>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="删除相册"
        description={`确定删除相册"${confirmDelete}"?相册将移到回收站。`}
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

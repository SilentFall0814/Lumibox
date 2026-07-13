import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { formatBytes, formatDate } from '../../lib/utils';
import { ConfirmDialog } from '../ui/dialog';
import { Button } from '../ui/button';
import type { TrashItem } from '../../../../shared/types';

export default function TrashView() {
  const dispatch = useDispatch<AppDispatch>();
  const currentView = useSelector((s: RootState) => s.ui.currentView);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await window.lumibox.trash.listTrash();
      setItems(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (currentView === 'trash') refresh();
  }, [currentView, refresh]);

  const handleRestore = async (id: number) => {
    try {
      await window.lumibox.trash.restore(id);
      toast.success('已恢复');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handlePurge = async () => {
    if (confirmPurge === null) return;
    try {
      await window.lumibox.trash.purge(confirmPurge);
      toast.success('已永久删除');
      setConfirmPurge(null);
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
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (currentView !== 'trash') return null;

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">回收站</h2>
        {items.length > 0 && (
          <Button variant="danger" size="sm" onClick={() => setConfirmEmpty(true)}>
            清空回收站
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-fg">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <p className="text-sm">回收站为空</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-foreground">{item.originalPath}</p>
                <p className="text-xs text-muted-fg">
                  {formatDate(item.trashedAt)} · {formatBytes(item.size)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(item.id)}>
                  恢复
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmPurge(item.id)}>
                  彻底删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

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
        description="此操作不可恢复,确定永久删除该文件?"
        confirmText="删除"
        variant="danger"
        onConfirm={handlePurge}
        onCancel={() => setConfirmPurge(null)}
      />
    </div>
  );
}

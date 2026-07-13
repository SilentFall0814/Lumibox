import { ipcMain } from 'electron';
import path from 'path';
import { listTrash, getTrashItem, markTrashRestored, deleteTrashRecord, deleteAllTrashRecords } from '../services/database';
import { restoreFromTrash, purgeTrash, emptyTrashDir } from '../services/fs-ops';
import { getLibraryRoot } from '../services/path-guard';

export function registerTrashHandlers(): void {
  ipcMain.handle('trash:listTrash', () => listTrash());

  ipcMain.handle('trash:restore', (_evt, trashId: number) => {
    const item = getTrashItem(trashId);
    if (!item) throw new Error('回收站记录不存在');
    const originalAbs = path.join(getLibraryRoot(), item.originalPath);
    restoreFromTrash(item.trashName, originalAbs);
    markTrashRestored(trashId);
  });

  ipcMain.handle('trash:purge', (_evt, trashId: number) => {
    const item = getTrashItem(trashId);
    if (!item) throw new Error('回收站记录不存在');
    purgeTrash(item.trashName);
    deleteTrashRecord(trashId);
  });

  ipcMain.handle('trash:emptyTrash', () => {
    emptyTrashDir();
    deleteAllTrashRecords();
  });
}

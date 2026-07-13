import { ipcMain } from 'electron';
import path from 'path';
import { undoStack } from '../services/undo-stack';
import { restoreFromTrash } from '../services/fs-ops';
import { getTrashItem, markTrashRestored } from '../services/database';
import { moveImages } from '../services/fs-ops';
import { getLibraryRoot } from '../services/path-guard';
import type { DeleteUndoData, MoveUndoData } from '../../shared/types';

export function registerUndoHandlers(): void {
  ipcMain.handle('undo:pushUndo', (_evt, entry) => {
    undoStack.push(entry);
  });

  ipcMain.handle('undo:canUndo', () => undoStack.canUndo());

  ipcMain.handle('undo:undo', () => {
    const result = undoStack.undo();
    if (!result.ok || !result.undone) return result;
    const entry = result.undone;
    try {
      if (entry.type === 'delete') {
        const data = entry.data as DeleteUndoData;
        const root = getLibraryRoot();
        for (const trashId of data.trashIds) {
          const item = getTrashItem(trashId);
          if (!item) continue;
          restoreFromTrash(item.trashName, path.join(root, item.originalPath));
          markTrashRestored(trashId);
        }
      } else if (entry.type === 'move') {
        const data = entry.data as MoveUndoData;
        const root = getLibraryRoot();
        for (const mv of data.moves) {
          moveImages([path.join(root, mv.to)], path.dirname(path.join(root, mv.from)));
        }
      }
      return result;
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
}

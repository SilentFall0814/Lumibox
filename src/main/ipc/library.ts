import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadConfig, addLibrary, getCurrentLibrary, setCurrentLibrary, toConfig } from '../services/config';
import { setLibraryRoot } from '../services/path-guard';
import { openDatabase, initSchema, closeDatabase } from '../services/database';
import { startScan } from '../services/scanner';

export function registerLibraryHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('library:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('library:initLibrary', async (_evt, rootPath: string) => {
    try {
      const abs = path.resolve(rootPath);
      if (!fs.existsSync(abs)) return { ok: false, error: '目录不存在' };
      try {
        fs.accessSync(abs, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        return { ok: false, error: '无读写权限' };
      }
      const lumiboxDir = path.join(abs, '.lumibox');
      fs.mkdirSync(path.join(lumiboxDir, 'cache'), { recursive: true });
      fs.mkdirSync(path.join(lumiboxDir, 'trash'), { recursive: true });
      const dbPath = path.join(lumiboxDir, 'db.sqlite');
      closeDatabase();
      openDatabase(dbPath);
      initSchema();
      const cfg = addLibrary(abs);
      setLibraryRoot(abs);
      const win = getMainWindow();
      if (win) await startScan(win);
      return { ok: true, library: cfg.libraries[cfg.libraries.length - 1] };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });

  ipcMain.handle('library:getConfig', () => {
    const cfg = loadConfig();
    const lib = getCurrentLibrary();
    if (lib) setLibraryRoot(lib.rootPath);
    return toConfig(cfg);
  });

  ipcMain.handle('library:listLibraries', () => loadConfig().libraries);

  ipcMain.handle('library:switchLibrary', async (_evt, id: number) => {
    const cfg = setCurrentLibrary(id);
    const lib = cfg.libraries.find((l) => l.id === id);
    if (!lib) throw new Error('库不存在');
    setLibraryRoot(lib.rootPath);
    closeDatabase();
    const dbPath = path.join(lib.rootPath, '.lumibox', 'db.sqlite');
    if (fs.existsSync(dbPath)) {
      openDatabase(dbPath);
      initSchema();
      const win = getMainWindow();
      if (win) await startScan(win);
    }
  });
}

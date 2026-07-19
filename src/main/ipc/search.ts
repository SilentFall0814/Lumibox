import { ipcMain } from 'electron';
import { searchByName, searchByDateRange, searchByExif } from '../services/database';

export function registerSearchHandlers(): void {
  ipcMain.handle('search:byName', (_evt, q: string) => searchByName(q));
  ipcMain.handle('search:byDateRange', (_evt, from: number, to: number) => searchByDateRange(from, to));
  ipcMain.handle('search:byExif', (_evt, camera?: string, lens?: string) => searchByExif(camera, lens));
}

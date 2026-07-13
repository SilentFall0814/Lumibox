import { ipcMain } from 'electron';

export function registerViewerHandlers(): void {
  // 全屏查看由渲染层处理,此处仅占位保持 API 一致
  ipcMain.handle('viewer:openFullscreen', () => {
    // no-op
  });
}

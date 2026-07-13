import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';

// electron-forge webpack plugin 通过 DefinePlugin 注入的全局常量
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createMainWindow(): BrowserWindow {
  // 移除默认的英文应用菜单(File Edit View Window Help)
  Menu.setApplicationMenu(null);

  // 图标路径:使用圆角矩形切边版本
  let iconPath: string;
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'icon.png');
  } else {
    // 开发态用 app.getAppPath() 获取项目根目录
    iconPath = path.join(app.getAppPath(), 'build', 'icon.png');
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#ffffff',
    title: '拾光盒 Lumibox',
    icon: iconPath,
    autoHideMenuBar: true, // 隐藏菜单栏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // better-sqlite3 等需要 preload 可用,实际通过 contextBridge 隔离
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  // 不自动打开 DevTools,按 F12 或 Ctrl+Shift+I 手动打开
  // 把渲染层 console 消息转发到主进程 stdout,便于调试
  win.webContents.on('console-message', (_e, _level, message, _line, _sourceId) => {
    console.log(`[renderer] ${message}`);
  });

  // 捕获渲染层加载失败
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error(`[did-fail-load] ${errorCode} ${errorDescription} url=${validatedURL}`);
  });

  // 捕获渲染层崩溃
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error(`[render-process-gone] ${details.reason}`);
  });

  // electron-forge webpack plugin 会注入 MAIN_WINDOW_WEBPACK_ENTRY
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  return win;
}

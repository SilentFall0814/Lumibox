import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import fs from 'fs';
import { createMainWindow } from './window';
import { registerAllHandlers } from './ipc';
import { getCurrentLibrary } from './services/config';
import { setLibraryRoot, resolveLibraryPath, isInsideLumibox, hasLibraryRoot } from './services/path-guard';
import { openDatabase, initSchema, closeDatabase } from './services/database';
import { startScan } from './services/scanner';

let mainWindow: BrowserWindow | null = null;

// 必须在 app.whenReady() 之前注册 scheme 为 privileged
// 否则浏览器不识别 lumibox:// 协议,<img src="lumibox://..."> 加载会失败
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'lumibox',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true  // 绕过 CSP,避免 fetch/img/video 被阻止
    }
  }
]);

// 根据扩展名获取 MIME 类型
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv', '.m4v': 'video/x-m4v'
  };
  return types[ext] || 'application/octet-stream';
}

// 注册自定义协议 lumibox://img/<相对路径>
// 用于在渲染层安全加载库内媒体文件(图片/视频),绕过 CSP 对 file:// 的限制
// 手动处理 Range 请求,支持视频拖动进度条
function registerLumiboxProtocol(): void {
  protocol.handle('lumibox', async (request) => {
    try {
      const url = new URL(request.url);
      // 仅允许 lumibox://img/<path> 形式
      if (url.host !== 'img') {
        return new Response('Forbidden', { status: 403 });
      }
      // pathname 形如 /a/b/c.jpg,去掉前导斜杠后 decode
      const relPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
      if (!relPath || !hasLibraryRoot()) {
        return new Response('Not Found', { status: 404 });
      }
      // 解析为绝对路径并校验越界
      const absPath = resolveLibraryPath(relPath);
      // 禁止访问 .lumibox 内部文件
      if (isInsideLumibox(absPath)) {
        return new Response('Forbidden', { status: 403 });
      }
      const stat = fs.statSync(absPath);
      const fileSize = stat.size;
      const mimeType = getMimeType(absPath);

      // 解析 Range header(视频拖动进度条时浏览器会发送)
      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        // 格式: bytes=start-end
        const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
          const chunkSize = end - start + 1;
          const stream = fs.createReadStream(absPath, { start, end });
          return new Response(stream as any, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize.toString(),
              'Content-Type': mimeType
            }
          });
        }
      }

      // 无 Range 请求:返回完整文件
      const stream = fs.createReadStream(absPath);
      return new Response(stream as any, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes'
        }
      });
    } catch (err) {
      console.error('[lumibox-protocol] 异常:', err);
      return new Response('Error', { status: 500 });
    }
  });
}

function bootstrap(): void {
  // 注册自定义协议(必须在窗口创建前)
  registerLumiboxProtocol();
  mainWindow = createMainWindow();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 注册所有 IPC 处理器
  registerAllHandlers(() => mainWindow);

  // 若已有库配置,自动打开 DB 并扫描
  const lib = getCurrentLibrary();
  if (lib) {
    setLibraryRoot(lib.rootPath);
    const dbPath = path.join(lib.rootPath, '.lumibox', 'db.sqlite');
    if (fs.existsSync(dbPath)) {
      openDatabase(dbPath);
      initSchema();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.on('did-finish-load', () => {
          startScan(mainWindow!);
        });
      }
    }
  }
}

app.whenReady().then(bootstrap);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) bootstrap();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});

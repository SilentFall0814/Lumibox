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

// 注册自定义协议
// - lumibox://img/<相对路径>:加载库内原图/视频,支持 Range 请求
//   响应头含 Cache-Control: max-age=604800, immutable,让 Chromium 浏览器缓存加速二次访问
// - lumibox://vframe/<imageId>:实时生成视频封面帧(JPEG)
//   主进程内存缓存抓帧结果,同一视频二次访问秒返回;浏览器侧也走 HTTP 缓存
function registerLumiboxProtocol(): void {
  protocol.handle('lumibox', async (request) => {
    try {
      const url = new URL(request.url);
      // pathname 形如 /a/b/c.jpg,去掉前导斜杠后 decode
      const relPath = decodeURIComponent(url.pathname.replace(/^\//, ''));
      if (!relPath || !hasLibraryRoot()) {
        return new Response('Not Found', { status: 404 });
      }

      // lumibox://vframe/<imageId> 路由:实时生成视频帧(内存缓存,无磁盘文件)
      if (url.host === 'vframe') {
        const imageId = parseInt(relPath, 10);
        if (!Number.isFinite(imageId) || imageId <= 0) {
          return new Response('Bad Request', { status: 400 });
        }
        const { getVideoFrame } = require('./services/frame-cache');
        const result = await getVideoFrame(imageId);
        if (!result) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(result.buffer as any, {
          status: 200,
          headers: {
            'Content-Type': result.mime,
            'Content-Length': result.buffer.length.toString(),
            // 浏览器侧缓存 7 天,二次访问秒开
            'Cache-Control': 'public, max-age=604800, immutable'
          }
        });
      }

      // lumibox://thumb/<imageId> 路由:实时生成图片缩略图(400×300 JPEG,内存 LRU 缓存)
      // 避免网格视图同时加载上百张多兆原图导致卡顿
      if (url.host === 'thumb') {
        const imageId = parseInt(relPath, 10);
        if (!Number.isFinite(imageId) || imageId <= 0) {
          return new Response('Bad Request', { status: 400 });
        }
        const { getImageThumbnail } = require('./services/image-thumb');
        const result = await getImageThumbnail(imageId);
        if (!result) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(result.buffer as any, {
          status: 200,
          headers: {
            'Content-Type': result.mime,
            'Content-Length': result.buffer.length.toString(),
            // 浏览器侧缓存 7 天,二次访问秒开
            'Cache-Control': 'public, max-age=604800, immutable'
          }
        });
      }

      // lumibox://trash-thumb/<trashId> 路由:回收站缩略图
      // 回收站项目的 images 表记录已被删除,无法用 imageId,这里直接从 trash 目录读文件
      if (url.host === 'trash-thumb') {
        const trashId = parseInt(relPath, 10);
        if (!Number.isFinite(trashId) || trashId <= 0) {
          return new Response('Bad Request', { status: 400 });
        }
        const { getTrashThumbnail } = require('./services/trash-thumb');
        const result = await getTrashThumbnail(trashId);
        if (!result) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(result.buffer as any, {
          status: 200,
          headers: {
            'Content-Type': result.mime,
            'Content-Length': result.buffer.length.toString(),
            'Cache-Control': 'public, max-age=604800, immutable'
          }
        });
      }

      // lumibox://img/<相对路径>:仅允许该形式
      if (url.host !== 'img') {
        return new Response('Forbidden', { status: 403 });
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
              'Content-Type': mimeType,
              // 视频流不缓存,每次都重新读取
              'Cache-Control': 'no-cache'
            }
          });
        }
      }

      // 无 Range 请求:返回完整文件(图片走浏览器缓存,视频不走)
      const stream = fs.createReadStream(absPath);
      const isVideo = mimeType.startsWith('video/');
      return new Response(stream as any, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          // 图片:浏览器缓存 7 天,二次访问秒开;视频:不缓存(走 Range 请求)
          'Cache-Control': isVideo ? 'no-cache' : 'public, max-age=604800, immutable'
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
    // 清理旧版本遗留的磁盘缩略图缓存(新方案不再使用磁盘缓存)
    cleanupLegacyDiskCache(lib.rootPath);
    const dbPath = path.join(lib.rootPath, '.lumibox', 'db.sqlite');
    if (fs.existsSync(dbPath)) {
      openDatabase(dbPath);
      initSchema();
      // 启动时立即清理一次过期回收站(30 天前删除的项)
      cleanupExpiredTrash();
      // 每小时检查一次过期回收站
      startTrashAutoCleanupTimer();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.on('did-finish-load', () => {
          startScan(mainWindow!);
        });
      }
    }
  }
}

/**
 * 清理过期回收站(30 天前删除的项自动彻底删除)
 * - 数据库删除记录 + 磁盘删除 trash 文件
 * - 静默执行,失败仅打日志
 */
function cleanupExpiredTrash(): void {
  try {
    const { purgeExpiredTrash } = require('./services/database');
    const { purgeTrashList } = require('./services/fs-ops');
    const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
    const cutoff = Date.now() - RETENTION_MS;
    const expired = purgeExpiredTrash(cutoff);
    if (expired.length > 0) {
      purgeTrashList(expired.map((e: { trashName: string }) => e.trashName));
      console.log(`[trash] 自动清理了 ${expired.length} 个过期回收站项`);
    }
  } catch (err) {
    console.error('[trash] 自动清理失败:', err);
  }
}

/** 每小时检查一次过期回收站 */
let trashTimer: ReturnType<typeof setInterval> | null = null;
function startTrashAutoCleanupTimer(): void {
  if (trashTimer) clearInterval(trashTimer);
  trashTimer = setInterval(cleanupExpiredTrash, 60 * 60 * 1000); // 1 小时
}

// 清理旧版本遗留的 .lumibox/cache 目录(新方案已改为内存缓存 + 浏览器 HTTP 缓存)
function cleanupLegacyDiskCache(rootPath: string): void {
  try {
    const cacheDir = path.join(rootPath, '.lumibox', 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('[lumibox] 已清理旧版磁盘缩略图缓存:', cacheDir);
    }
  } catch (err) {
    console.error('[lumibox] 清理旧缓存失败:', err);
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
  // 停止回收站自动清理定时器
  if (trashTimer) { clearInterval(trashTimer); trashTimer = null; }
  // 清理视频帧内存缓存
  try {
    const { clearFrameCache } = require('./services/frame-cache');
    clearFrameCache();
  } catch { /* 忽略 */ }
  // 清理图片缩略图内存缓存
  try {
    const { clearImageThumbCache } = require('./services/image-thumb');
    clearImageThumbCache();
  } catch { /* 忽略 */ }
  // 清理回收站缩略图内存缓存
  try {
    const { clearTrashThumbCache } = require('./services/trash-thumb');
    clearTrashThumbCache();
  } catch { /* 忽略 */ }
});

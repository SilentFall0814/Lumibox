import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { getLibraryRoot } from './path-guard';
import { isMediaFile, getMediaType } from './fs-ops';
import { insertImage, deleteImageByPath, getImageByPath, updateImageMeta, updateVideoMeta } from './database';
import { probeVideoMetadata, pickRandomTimestamp } from './video-probe';
import { createLogger } from './logger';

const logger = createLogger('scanner');

let watcher: import('chokidar').FSWatcher | null = null;
let scanning = false;

/**
 * 启动扫描:全量扫描 + chokidar 持续监听
 * - 全量扫描:遍历库根所有媒体文件,写入数据库索引
 * - chokidar 监听:文件 add/unlink/change 时实时更新索引并通知渲染层
 */

export async function startScan(win: BrowserWindow): Promise<void> {
  const root = getLibraryRoot();
  if (!scanning) {
    scanning = true;
    await fullScan(root, win);
    scanning = false;
  }
  if (watcher) watcher.close();
  const chokidar = require('chokidar');
  watcher = chokidar.watch(root, {
    ignored: /(^|[\\/])\.lumibox([\\/]|$)/,
    ignoreInitial: true,
    persistent: true
  });
  watcher.on('add', (filePath: string) => {
    if (!isMediaFile(filePath)) return;
    indexImage(filePath);
    win.webContents.send('image:changed', { type: 'add', path: filePath });
  });
  watcher.on('unlink', (filePath: string) => {
    if (!isMediaFile(filePath)) return;
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    deleteImageByPath(rel);
    win.webContents.send('image:changed', { type: 'unlink', path: rel });
  });
  // 文件内容变化(如在文件资源管理器中替换/编辑图片):更新元数据,通知渲染层刷新
  watcher.on('change', (filePath: string) => {
    if (!isMediaFile(filePath)) return;
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    // 更新数据库元数据(mtime/size)
    try {
      const stat = fs.statSync(filePath);
      const existing = getImageByPath(rel);
      if (existing) {
        updateImageMeta(existing.id, stat.mtimeMs, stat.size);
      }
    } catch (e) { logger.warn('更新文件元数据失败', { filePath, err: String(e) }); }
    win.webContents.send('image:changed', { type: 'change', path: rel });
  });
  watcher.on('addDir', () => win.webContents.send('album:changed'));
  watcher.on('unlinkDir', () => win.webContents.send('album:changed'));
}

async function fullScan(root: string, win: BrowserWindow): Promise<void> {
  const allFiles = collectMediaFiles(root);
  const total = allFiles.length;
  let current = 0;
  const batchSize = 500;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    // 视频元数据探查并发限制(避免 ffprobe 进程过多)
    const probeConcurrency = 4;
    for (let j = 0; j < batch.length; j += probeConcurrency) {
      const slice = batch.slice(j, j + probeConcurrency);
      await Promise.all(slice.map((file) => indexImageAsync(file)));
      current += slice.length;
    }
    win.webContents.send('scan:progress', current, total);
    await new Promise((r) => setImmediate(r));
  }
  win.webContents.send('scan:progress', total, total);
  win.webContents.send('scan:done');
}

function collectMediaFiles(dir: string): string[] {
  const result: string[] = [];
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { logger.warn('读取目录失败', { dir: d, err: String(e) }); return; }
    for (const e of entries) {
      if (e.name === '.lumibox') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && isMediaFile(e.name)) result.push(full);
    }
  };
  walk(dir);
  return result;
}

function indexImage(absolutePath: string): void {
  const root = getLibraryRoot();
  const rel = path.relative(root, absolutePath).replace(/\\/g, '/');
  if (getImageByPath(rel)) return;
  try {
    const stat = fs.statSync(absolutePath);
    const mediaType = getMediaType(absolutePath) ?? 'image';
    insertImage({
      path: rel,
      name: path.basename(absolutePath),
      type: mediaType,
      createdAt: stat.mtimeMs,
      size: stat.size
    });
  } catch (e) {
    logger.warn('索引文件失败', { absolutePath, err: String(e) });
  }
}

// 异步索引:视频额外探查元数据(分辨率/时长/帧率/码率/随机封面帧时间戳)
// 图片也读取尺寸(宽高)存入数据库,避免全屏查看时显示 "?x?"
async function indexImageAsync(absolutePath: string): Promise<void> {
  const root = getLibraryRoot();
  const rel = path.relative(root, absolutePath).replace(/\\/g, '/');
  if (getImageByPath(rel)) return;
  try {
    const stat = fs.statSync(absolutePath);
    const mediaType = getMediaType(absolutePath) ?? 'image';
    const id = insertImage({
      path: rel,
      name: path.basename(absolutePath),
      type: mediaType,
      createdAt: stat.mtimeMs,
      size: stat.size
    });
    // 视频探查元数据(仅写入数据库,不再预生成缩略图文件)
    if (mediaType === 'video' && id > 0) {
      try {
        const probe = await probeVideoMetadata(absolutePath);
        if (probe.width || probe.duration || probe.fps || probe.bitrate) {
          const thumbnailTime = pickRandomTimestamp(absolutePath, probe.duration);
          updateVideoMeta(id, {
            width: probe.width,
            height: probe.height,
            duration: probe.duration,
            fps: probe.fps,
            bitrate: probe.bitrate,
            videoThumbnailTime: thumbnailTime
          });
        }
      } catch (e) {
        logger.warn('视频元数据探查失败', { absolutePath, err: String(e) });
      }
    } else if (mediaType === 'image' && id > 0) {
      // 图片:用 sharp 读取宽高(仅读头部,不解码全图,非常快)
      try {
        const sharp = require('sharp');
        const meta = await sharp(absolutePath).metadata();
        if (meta.width && meta.height) {
          updateVideoMeta(id, { width: meta.width, height: meta.height });
        }
      } catch (e) {
        logger.warn('sharp 读取图片尺寸失败', { absolutePath, err: String(e) });
      }
    }
  } catch (e) {
    logger.warn('索引文件失败', { absolutePath, err: String(e) });
  }
}

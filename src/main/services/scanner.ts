import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { getLibraryRoot } from './path-guard';
import { isMediaFile, getMediaType } from './fs-ops';
import { insertImage, deleteImageByPath, getImageByPath, updateImageMeta } from './database';
import { getCachePath } from './thumbnail';

let watcher: import('chokidar').FSWatcher | null = null;
let scanning = false;

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
    // 同步删除缩略图缓存
    try { fs.unlinkSync(getCachePath(filePath)); } catch { /* 忽略 */ }
    win.webContents.send('image:changed', { type: 'unlink', path: rel });
  });
  // 文件内容变化(如在文件资源管理器中替换/编辑图片):删除旧缩略图,更新元数据,通知渲染层刷新
  watcher.on('change', (filePath: string) => {
    if (!isMediaFile(filePath)) return;
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    // 删除旧缩略图缓存,下次访问时重新生成
    try { fs.unlinkSync(getCachePath(filePath)); } catch { /* 忽略不存在 */ }
    // 更新数据库元数据(mtime/size)
    try {
      const stat = fs.statSync(filePath);
      const existing = getImageByPath(rel);
      if (existing) {
        updateImageMeta(existing.id, stat.mtimeMs, stat.size);
      }
    } catch { /* 忽略 */ }
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
    for (const file of batch) {
      indexImage(file);
      current++;
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
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
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
  } catch {
    // 忽略无法访问的文件
  }
}

export function stopScan(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

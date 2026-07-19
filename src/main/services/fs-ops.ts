import fs from 'fs';
import path from 'path';
import { assertWithinLibrary, getLibraryRoot, resolveLibraryPath, isInsideLumibox } from './path-guard';
import type { Album, MoveResult } from '../../shared/types';

export const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.heic', '.heif', '.avif', '.svg'
]);

export const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg', '.ts', '.3gp'
]);

export function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/** 判断是否为媒体文件(图片或视频) */
export function isMediaFile(filename: string): boolean {
  return isImageFile(filename) || isVideoFile(filename);
}

/** 获取媒体类型 */
export function getMediaType(filename: string): 'image' | 'video' | null {
  if (isImageFile(filename)) return 'image';
  if (isVideoFile(filename)) return 'video';
  return null;
}

// ============ 相册(文件夹) ============
export function listAlbums(): Album[] {
  const root = getLibraryRoot();
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name !== '.lumibox' && !e.name.startsWith('.'))
    .map((e) => {
      const abs = path.join(root, e.name);
      return {
        name: e.name,
        path: e.name,
        absolutePath: abs,
        imageCount: countMediaInDir(abs)
      };
    });
}

function countMediaInDir(dir: string): number {
  let count = 0;
  const walk = (d: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (isMediaFile(entry.name)) count++;
    }
  };
  walk(dir);
  return count;
}

export function createAlbum(name: string): Album {
  validateAlbumName(name);
  const root = getLibraryRoot();
  const abs = path.join(root, name);
  if (fs.existsSync(abs)) throw new Error(`相册"${name}"已存在`);
  fs.mkdirSync(abs, { recursive: true });
  return { name, path: name, absolutePath: abs, imageCount: 0 };
}

export function renameAlbum(oldName: string, newName: string): void {
  validateAlbumName(newName);
  const root = getLibraryRoot();
  const oldAbs = path.join(root, oldName);
  const newAbs = path.join(root, newName);
  assertWithinLibrary(oldAbs);
  assertWithinLibrary(newAbs);
  if (!fs.existsSync(oldAbs)) throw new Error(`原相册"${oldName}"不存在`);
  if (fs.existsSync(newAbs)) throw new Error(`目标名称"${newName}"已存在`);
  fs.renameSync(oldAbs, newAbs);
}

export function removeAlbumToTrash(albumPath: string): string {
  const abs = resolveLibraryPath(albumPath);
  if (!fs.existsSync(abs)) throw new Error('相册不存在');
  const root = getLibraryRoot();
  const trashName = `${path.basename(albumPath)}_${Date.now()}.dir`;
  const trashPath = path.join(root, '.lumibox', 'trash', trashName);
  fs.renameSync(abs, trashPath);
  return trashName;
}

function validateAlbumName(name: string): void {
  if (!name || name.trim() !== name) throw new Error('相册名不能为空或含前后空格');
  const illegal = /[<>:"/\\|?*]/;
  if (illegal.test(name)) throw new Error('相册名包含非法字符');
  if (name === '.lumibox') throw new Error('保留名称');
  if (name.startsWith('.')) throw new Error('相册名不能以点开头');
}

// ============ 图片移动/复制 ============
export function moveImages(srcAbsolutePaths: string[], destDir: string): MoveResult {
  assertWithinLibrary(destDir);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const moved: string[] = [];
  const failed: { path: string; error: string }[] = [];
  for (const src of srcAbsolutePaths) {
    try {
      // 源路径如果在库内则校验
      try { assertWithinLibrary(src); } catch { /* 外部文件拖入,允许 */ }
      if (!fs.existsSync(src)) { failed.push({ path: src, error: '源文件不存在' }); continue; }
      const dest = uniqueDestPath(destDir, path.basename(src));
      fs.renameSync(src, dest);
      moved.push(dest);
    } catch (e) {
      failed.push({ path: src, error: (e as Error).message });
    }
  }
  return { moved: moved.length, failed };
}

export function copyImages(srcAbsolutePaths: string[], destDir: string): MoveResult {
  assertWithinLibrary(destDir);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const moved: string[] = [];
  const failed: { path: string; error: string }[] = [];
  for (const src of srcAbsolutePaths) {
    try {
      if (!fs.existsSync(src)) { failed.push({ path: src, error: '源文件不存在' }); continue; }
      const dest = uniqueDestPath(destDir, path.basename(src));
      fs.copyFileSync(src, dest);
      moved.push(dest);
    } catch (e) {
      failed.push({ path: src, error: (e as Error).message });
    }
  }
  return { moved: moved.length, failed };
}

function uniqueDestPath(destDir: string, filename: string): string {
  let candidate = path.join(destDir, filename);
  if (!fs.existsSync(candidate)) return candidate;
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(destDir, `${base} (${i})${ext}`);
    i++;
  }
  return candidate;
}

// ============ 回收站文件操作 ============
export function moveToTrash(srcAbsolutePath: string): { trashName: string; size: number } {
  assertWithinLibrary(srcAbsolutePath);
  if (isInsideLumibox(srcAbsolutePath)) throw new Error('禁止删除 .lumibox 系统文件');
  if (!fs.existsSync(srcAbsolutePath)) throw new Error('源文件不存在');
  const root = getLibraryRoot();
  const stat = fs.statSync(srcAbsolutePath);
  const ext = path.extname(srcAbsolutePath);
  const base = path.basename(srcAbsolutePath, ext);
  const trashName = `${base}_${Date.now()}${ext}`;
  const trashPath = path.join(root, '.lumibox', 'trash', trashName);
  fs.renameSync(srcAbsolutePath, trashPath);
  return { trashName, size: stat.size };
}

export function restoreFromTrash(trashName: string, originalAbsolutePath: string): void {
  assertWithinLibrary(originalAbsolutePath);
  const root = getLibraryRoot();
  const trashPath = path.join(root, '.lumibox', 'trash', trashName);
  if (!fs.existsSync(trashPath)) throw new Error('回收站文件不存在');
  fs.mkdirSync(path.dirname(originalAbsolutePath), { recursive: true });
  const dest = uniqueDestPath(path.dirname(originalAbsolutePath), path.basename(originalAbsolutePath));
  fs.renameSync(trashPath, dest);
}

export function purgeTrash(trashName: string): void {
  const root = getLibraryRoot();
  const trashPath = path.join(root, '.lumibox', 'trash', trashName);
  if (fs.existsSync(trashPath)) fs.rmSync(trashPath, { recursive: true, force: true });
}

/** 批量清理回收站磁盘文件(用于自动清理过期项) */
export function purgeTrashList(trashNames: string[]): void {
  const root = getLibraryRoot();
  const trashDir = path.join(root, '.lumibox', 'trash');
  for (const name of trashNames) {
    const trashPath = path.join(trashDir, name);
    try {
      if (fs.existsSync(trashPath)) fs.rmSync(trashPath, { recursive: true, force: true });
    } catch (err) {
      console.error('[fs-ops] 清理回收站文件失败:', name, err);
    }
  }
}

export function emptyTrashDir(): void {
  const root = getLibraryRoot();
  const trashDir = path.join(root, '.lumibox', 'trash');
  if (!fs.existsSync(trashDir)) return;
  for (const entry of fs.readdirSync(trashDir)) {
    fs.rmSync(path.join(trashDir, entry), { recursive: true, force: true });
  }
}

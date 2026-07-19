import type Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import type { ImageRecord, ImagePage, TrashItem } from '../../shared/types';

let db: DB | null = null;

export function openDatabase(dbPath: string): void {
  if (db) closeDatabase();
  // 动态 require,避免在渲染层或测试环境被 webpack 错误打包
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initSchema(): void {
  if (!db) throw new Error('数据库未打开');
  // 1. 创建表(新库会包含 type/duration 列;旧库表已存在则跳过)
  // 注:旧的 tags/image_tags/albums_virtual/album_images 表已随标签系统与虚拟相册系统移除
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'image',
      created_at INTEGER NOT NULL,
      hash TEXT,
      exif_camera TEXT,
      exif_lens TEXT,
      exif_date INTEGER,
      width INTEGER,
      height INTEGER,
      size INTEGER,
      duration REAL,
      indexed_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trash (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER,
      original_path TEXT NOT NULL,
      trash_name TEXT NOT NULL,
      trashed_at INTEGER NOT NULL,
      size INTEGER,
      restored INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_images_path ON images(path);
    CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
  `);
  // 2. 兼容旧库:若 images 表缺少 type/duration 列则补上(必须在建索引前)
  try {
    db.exec(`ALTER TABLE images ADD COLUMN type TEXT NOT NULL DEFAULT 'image'`);
  } catch { /* 列已存在 */ }
  try {
    db.exec(`ALTER TABLE images ADD COLUMN duration REAL`);
  } catch { /* 列已存在 */ }
  // 2.1 兼容旧库:补充视频元数据列(fps/bitrate/video_thumbnail_time)
  try {
    db.exec(`ALTER TABLE images ADD COLUMN fps REAL`);
  } catch { /* 列已存在 */ }
  try {
    db.exec(`ALTER TABLE images ADD COLUMN bitrate INTEGER`);
  } catch { /* 列已存在 */ }
  try {
    db.exec(`ALTER TABLE images ADD COLUMN video_thumbnail_time REAL`);
  } catch { /* 列已存在 */ }
  // 3. type 列存在后再创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_images_type ON images(type);`);
}

function requireDb(): DB {
  if (!db) throw new Error('数据库未打开');
  return db;
}

// ============ 媒体(图片+视频) ============
export function insertImage(data: {
  path: string; name: string; createdAt: number; size: number;
  type?: 'image' | 'video'; duration?: number;
  hash?: string; exifCamera?: string; exifLens?: string; exifDate?: number;
  width?: number; height?: number;
  fps?: number; bitrate?: number; videoThumbnailTime?: number;
}): number {
  const d = requireDb();
  const stmt = d.prepare(`
    INSERT OR IGNORE INTO images (path, name, type, created_at, size, duration, hash, exif_camera, exif_lens, exif_date, width, height, fps, bitrate, video_thumbnail_time, indexed_at)
    VALUES (@path, @name, @type, @createdAt, @size, @duration, @hash, @exifCamera, @exifLens, @exifDate, @width, @height, @fps, @bitrate, @videoThumbnailTime, @indexedAt)
  `);
  const result = stmt.run({
    path: data.path, name: data.name,
    type: data.type ?? 'image',
    createdAt: data.createdAt, size: data.size,
    duration: data.duration ?? null,
    hash: data.hash ?? null, exifCamera: data.exifCamera ?? null, exifLens: data.exifLens ?? null,
    exifDate: data.exifDate ?? null, width: data.width ?? null, height: data.height ?? null,
    fps: data.fps ?? null, bitrate: data.bitrate ?? null, videoThumbnailTime: data.videoThumbnailTime ?? null,
    indexedAt: Date.now()
  });
  if (result.lastInsertRowid && Number(result.lastInsertRowid) > 0) {
    return Number(result.lastInsertRowid);
  }
  const row = d.prepare('SELECT id FROM images WHERE path = ?').get(data.path) as { id: number } | undefined;
  return row?.id ?? 0;
}

const IMAGE_COLS = `id, path, name, type, created_at as createdAt, exif_camera as exifCamera, exif_lens as exifLens, exif_date as exifDate, width, height, size, duration, fps, bitrate, video_thumbnail_time as videoThumbnailTime`;

export function getImageById(id: number): ImageRecord | null {
  const d = requireDb();
  const row = d.prepare(`SELECT ${IMAGE_COLS} FROM images WHERE id = ?`).get(id) as ImageRecord | undefined;
  return row ?? null;
}

export function getImageByPath(p: string): ImageRecord | null {
  const d = requireDb();
  const row = d.prepare(`SELECT ${IMAGE_COLS} FROM images WHERE path = ?`).get(p) as ImageRecord | undefined;
  return row ?? null;
}

export function listImagesByDir(dirPath: string, page: number, pageSize: number): ImagePage {
  const d = requireDb();
  const offset = (page - 1) * pageSize;
  // 根目录(空路径或'/'):返回所有媒体文件
  if (dirPath === '/' || dirPath === '') {
    const items = d.prepare(`
      SELECT ${IMAGE_COLS} FROM images
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(pageSize, offset) as ImageRecord[];
    const total = (d.prepare(`SELECT COUNT(*) as c FROM images`).get() as { c: number }).c;
    return { items, total, page, pageSize, hasMore: offset + pageSize < total };
  }
  // 子目录:返回该目录直接子文件(不递归子目录)
  const prefix = dirPath + '/';
  const likePattern = prefix + '%';
  const items = d.prepare(`
    SELECT ${IMAGE_COLS} FROM images
    WHERE path LIKE ? AND path NOT LIKE ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(likePattern, prefix + '%/%', pageSize, offset) as ImageRecord[];
  const total = (d.prepare(`SELECT COUNT(*) as c FROM images WHERE path LIKE ? AND path NOT LIKE ?`).get(likePattern, prefix + '%/%') as { c: number }).c;
  return { items, total, page, pageSize, hasMore: offset + pageSize < total };
}

export function deleteImage(id: number): void {
  const d = requireDb();
  d.prepare('DELETE FROM images WHERE id = ?').run(id);
}

export function deleteImageByPath(p: string): void {
  const d = requireDb();
  d.prepare('DELETE FROM images WHERE path = ?').run(p);
}

export function updateImagePath(id: number, newPath: string, newName: string): void {
  const d = requireDb();
  d.prepare('UPDATE images SET path = ?, name = ? WHERE id = ?').run(newPath, newName, id);
}

// 文件内容变化时更新元数据(mtime/size),用于热更新
export function updateImageMeta(id: number, createdAt: number, size: number): void {
  const d = requireDb();
  d.prepare('UPDATE images SET createdAt = ?, size = ? WHERE id = ?').run(createdAt, size, id);
}

// 更新视频元数据(分辨率/时长/帧率/码率/封面时间戳)
export function updateVideoMeta(id: number, data: {
  width?: number; height?: number; duration?: number; fps?: number; bitrate?: number; videoThumbnailTime?: number;
}): void {
  const d = requireDb();
  d.prepare(`
    UPDATE images SET
      width = COALESCE(@width, width),
      height = COALESCE(@height, height),
      duration = COALESCE(@duration, duration),
      fps = COALESCE(@fps, fps),
      bitrate = COALESCE(@bitrate, bitrate),
      video_thumbnail_time = COALESCE(@videoThumbnailTime, video_thumbnail_time)
    WHERE id = @id
  `).run({
    id,
    width: data.width ?? null,
    height: data.height ?? null,
    duration: data.duration ?? null,
    fps: data.fps ?? null,
    bitrate: data.bitrate ?? null,
    videoThumbnailTime: data.videoThumbnailTime ?? null
  });
}

// ============ 虚拟相册(已废弃,改用基于文件夹的相册,见 fs-ops.ts) ============
// 历史函数 listVirtualAlbums/createVirtualAlbum/addImageToVirtualAlbum/removeImageFromVirtualAlbum/deleteVirtualAlbum
// 已随 albums_virtual/album_images 表一并移除

// ============ 回收站 ============
export function insertTrash(data: {
  imageId: number | null; originalPath: string; trashName: string; size: number;
}): number {
  const d = requireDb();
  const result = d.prepare(`
    INSERT INTO trash (image_id, original_path, trash_name, trashed_at, size)
    VALUES (@imageId, @originalPath, @trashName, @trashedAt, @size)
  `).run({
    imageId: data.imageId, originalPath: data.originalPath,
    trashName: data.trashName, trashedAt: Date.now(), size: data.size
  });
  return Number(result.lastInsertRowid);
}

export function listTrash(): TrashItem[] {
  const d = requireDb();
  return d.prepare(`
    SELECT id, image_id as imageId, original_path as originalPath, trash_name as trashName,
           trashed_at as trashedAt, size, restored
    FROM trash WHERE restored = 0 ORDER BY trashed_at DESC
  `).all() as TrashItem[];
}

export function getTrashItem(id: number): TrashItem | null {
  const d = requireDb();
  const row = d.prepare(`
    SELECT id, image_id as imageId, original_path as originalPath, trash_name as trashName,
           trashed_at as trashedAt, size, restored
    FROM trash WHERE id = ?
  `).get(id) as TrashItem | undefined;
  return row ?? null;
}

export function markTrashRestored(id: number): void {
  const d = requireDb();
  d.prepare('UPDATE trash SET restored = 1 WHERE id = ?').run(id);
}

export function deleteTrashRecord(id: number): void {
  const d = requireDb();
  d.prepare('DELETE FROM trash WHERE id = ?').run(id);
}

export function deleteAllTrashRecords(): void {
  const d = requireDb();
  d.prepare('DELETE FROM trash WHERE restored = 0').run();
}

/**
 * 清理过期回收站记录
 * - 删除 trashed_at 早于 beforeTs 的未恢复记录
 * - 返回被删除记录的 id 与 trashName(用于同步删除磁盘文件)
 */
export function purgeExpiredTrash(beforeTs: number): { id: number; trashName: string }[] {
  const d = requireDb();
  // 先查出待清理项的 id + trashName(便于调用方删除磁盘文件)
  const expired = d.prepare(`
    SELECT id, trash_name as trashName FROM trash
    WHERE restored = 0 AND trashed_at < ?
  `).all(beforeTs) as { id: number; trashName: string }[];
  if (expired.length === 0) return [];
  // 批量删除记录
  const stmt = d.prepare('DELETE FROM trash WHERE id = ?');
  const tx = d.transaction((rows: { id: number }[]) => {
    for (const row of rows) stmt.run(row.id);
  });
  tx(expired);
  return expired;
}

// ============ 搜索 ============
export function searchByName(query: string): ImageRecord[] {
  const d = requireDb();
  return d.prepare(`
    SELECT ${IMAGE_COLS} FROM images WHERE name LIKE ? ORDER BY created_at DESC
  `).all(`%${query}%`) as ImageRecord[];
}

export function searchByDateRange(from: number, to: number): ImageRecord[] {
  const d = requireDb();
  return d.prepare(`
    SELECT ${IMAGE_COLS} FROM images WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC
  `).all(from, to) as ImageRecord[];
}

export function searchByExif(camera?: string, lens?: string): ImageRecord[] {
  const d = requireDb();
  const conditions: string[] = [];
  const params: string[] = [];
  if (camera) { conditions.push('exif_camera LIKE ?'); params.push(`%${camera}%`); }
  if (lens) { conditions.push('exif_lens LIKE ?'); params.push(`%${lens}%`); }
  if (conditions.length === 0) return [];
  return d.prepare(`
    SELECT ${IMAGE_COLS} FROM images WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC
  `).all(...params) as ImageRecord[];
}

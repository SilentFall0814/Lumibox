import type Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import type { ImageRecord, ImagePage, Tag, VirtualAlbum, TrashItem } from '../../shared/types';

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

export function isDbOpen(): boolean {
  return db !== null;
}

export function initSchema(): void {
  if (!db) throw new Error('数据库未打开');
  // 1. 创建表(新库会包含 type/duration 列;旧库表已存在则跳过)
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
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS image_tags (
      image_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (image_id, tag_id),
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS albums_virtual (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS album_images (
      album_id INTEGER NOT NULL,
      image_id INTEGER NOT NULL,
      PRIMARY KEY (album_id, image_id),
      FOREIGN KEY (album_id) REFERENCES albums_virtual(id) ON DELETE CASCADE,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
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
    CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_album_images_album ON album_images(album_id);
  `);
  // 2. 兼容旧库:若 images 表缺少 type/duration 列则补上(必须在建索引前)
  try {
    db.exec(`ALTER TABLE images ADD COLUMN type TEXT NOT NULL DEFAULT 'image'`);
  } catch { /* 列已存在 */ }
  try {
    db.exec(`ALTER TABLE images ADD COLUMN duration REAL`);
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
}): number {
  const d = requireDb();
  const stmt = d.prepare(`
    INSERT OR IGNORE INTO images (path, name, type, created_at, size, duration, hash, exif_camera, exif_lens, exif_date, width, height, indexed_at)
    VALUES (@path, @name, @type, @createdAt, @size, @duration, @hash, @exifCamera, @exifLens, @exifDate, @width, @height, @indexedAt)
  `);
  const result = stmt.run({
    path: data.path, name: data.name,
    type: data.type ?? 'image',
    createdAt: data.createdAt, size: data.size,
    duration: data.duration ?? null,
    hash: data.hash ?? null, exifCamera: data.exifCamera ?? null, exifLens: data.exifLens ?? null,
    exifDate: data.exifDate ?? null, width: data.width ?? null, height: data.height ?? null,
    indexedAt: Date.now()
  });
  if (result.lastInsertRowid && Number(result.lastInsertRowid) > 0) {
    return Number(result.lastInsertRowid);
  }
  const row = d.prepare('SELECT id FROM images WHERE path = ?').get(data.path) as { id: number } | undefined;
  return row?.id ?? 0;
}

const IMAGE_COLS = `id, path, name, type, created_at as createdAt, exif_camera as exifCamera, exif_lens as exifLens, exif_date as exifDate, width, height, size, duration`;

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

export function listAllImages(): ImageRecord[] {
  const d = requireDb();
  return d.prepare(`SELECT ${IMAGE_COLS} FROM images ORDER BY created_at DESC`).all() as ImageRecord[];
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

// ============ 标签 ============
export function listTags(): Tag[] {
  const d = requireDb();
  return d.prepare(`
    SELECT t.id, t.name, COUNT(it.image_id) as count
    FROM tags t LEFT JOIN image_tags it ON t.id = it.tag_id
    GROUP BY t.id ORDER BY t.name
  `).all() as Tag[];
}

export function createTag(name: string): Tag {
  const d = requireDb();
  const result = d.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
  return { id: Number(result.lastInsertRowid), name };
}

export function attachTag(imageId: number, tagId: number): void {
  const d = requireDb();
  d.prepare('INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)').run(imageId, tagId);
}

export function detachTag(imageId: number, tagId: number): void {
  const d = requireDb();
  d.prepare('DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?').run(imageId, tagId);
}

export function listTagsByImage(imageId: number): Tag[] {
  const d = requireDb();
  return d.prepare(`
    SELECT t.id, t.name FROM tags t
    JOIN image_tags it ON t.id = it.tag_id
    WHERE it.image_id = ? ORDER BY t.name
  `).all(imageId) as Tag[];
}

// ============ 虚拟相册 ============
export function listVirtualAlbums(): VirtualAlbum[] {
  const d = requireDb();
  return d.prepare(`
    SELECT a.id, a.name, COUNT(ai.image_id) as imageCount
    FROM albums_virtual a LEFT JOIN album_images ai ON a.id = ai.album_id
    GROUP BY a.id ORDER BY a.name
  `).all() as VirtualAlbum[];
}

export function createVirtualAlbum(name: string): VirtualAlbum {
  const d = requireDb();
  const result = d.prepare('INSERT INTO albums_virtual (name) VALUES (?)').run(name);
  return { id: Number(result.lastInsertRowid), name, imageCount: 0 };
}

export function addImageToVirtualAlbum(albumId: number, imageId: number): void {
  const d = requireDb();
  d.prepare('INSERT OR IGNORE INTO album_images (album_id, image_id) VALUES (?, ?)').run(albumId, imageId);
}

export function removeImageFromVirtualAlbum(albumId: number, imageId: number): void {
  const d = requireDb();
  d.prepare('DELETE FROM album_images WHERE album_id = ? AND image_id = ?').run(albumId, imageId);
}

export function deleteVirtualAlbum(id: number): void {
  const d = requireDb();
  d.prepare('DELETE FROM albums_virtual WHERE id = ?').run(id);
}

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

export function searchByTags(tagIds: number[]): ImageRecord[] {
  const d = requireDb();
  if (tagIds.length === 0) return [];
  const placeholders = tagIds.map(() => '?').join(',');
  return d.prepare(`
    SELECT DISTINCT ${IMAGE_COLS.replace('id, ', 'i.id, ')} FROM images i
    JOIN image_tags it ON i.id = it.image_id
    WHERE it.tag_id IN (${placeholders})
    GROUP BY i.id
    HAVING COUNT(DISTINCT it.tag_id) = ?
    ORDER BY i.created_at DESC
  `).all(...tagIds, tagIds.length) as ImageRecord[];
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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { openDatabase, closeDatabase, initSchema, insertImage, listImagesByDir, createTag, attachTag, listTagsByImage, createVirtualAlbum, addImageToVirtualAlbum, listVirtualAlbums } from '../../src/main/services/database';

describe('database', () => {
  let tmpRoot: string;
  let dbPath: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-db-'));
    dbPath = path.join(tmpRoot, '.lumibox', 'db.sqlite');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    openDatabase(dbPath);
    initSchema();
  });

  afterEach(() => {
    closeDatabase();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('建表幂等(重复调用不报错)', () => {
    expect(() => initSchema()).not.toThrow();
  });

  it('插入并按目录查询图片', () => {
    insertImage({ path: '相册A/1.jpg', name: '1.jpg', createdAt: Date.now(), size: 100 });
    insertImage({ path: '相册A/2.jpg', name: '2.jpg', createdAt: Date.now(), size: 200 });
    insertImage({ path: '相册B/3.jpg', name: '3.jpg', createdAt: Date.now(), size: 300 });
    const page = listImagesByDir('相册A', 1, 100);
    expect(page.items.length).toBe(2);
    expect(page.total).toBe(2);
  });

  it('标签 CRUD + 图片-标签关联', () => {
    const imgId = insertImage({ path: 'x.jpg', name: 'x.jpg', createdAt: 0, size: 0 });
    const tag = createTag('旅行');
    attachTag(imgId, tag.id);
    const tags = listTagsByImage(imgId);
    expect(tags.length).toBe(1);
    expect(tags[0].name).toBe('旅行');
  });

  it('虚拟相册:添加图片不复制文件', () => {
    const imgId = insertImage({ path: 'a.jpg', name: 'a.jpg', createdAt: 0, size: 0 });
    const album = createVirtualAlbum('精选');
    addImageToVirtualAlbum(album.id, imgId);
    const list = listVirtualAlbums();
    expect(list[0].imageCount).toBe(1);
  });
});

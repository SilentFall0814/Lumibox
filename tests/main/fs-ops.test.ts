import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setLibraryRoot } from '../../src/main/services/path-guard';
import { moveImages, copyImages, moveToTrash, restoreFromTrash, listAlbums, createAlbum, renameAlbum, IMAGE_EXTENSIONS } from '../../src/main/services/fs-ops';

describe('fs-ops', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-fs-'));
    setLibraryRoot(root);
    fs.mkdirSync(path.join(root, '相册A'), { recursive: true });
    fs.writeFileSync(path.join(root, '相册A', '1.jpg'), 'img1');
    fs.writeFileSync(path.join(root, '相册A', '2.jpg'), 'img2');
    fs.mkdirSync(path.join(root, '.lumibox', 'trash'), { recursive: true });
    fs.mkdirSync(path.join(root, '.lumibox', 'cache'), { recursive: true });
  });

  afterEach(() => {
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('moveImages:移动而非复制(原位置不再存在)', () => {
    const src = path.join(root, '相册A', '1.jpg');
    moveImages([src], path.join(root, '相册B'));
    expect(fs.existsSync(src)).toBe(false);
    expect(fs.existsSync(path.join(root, '相册B', '1.jpg'))).toBe(true);
  });

  it('copyImages:复制(原位置仍存在)', () => {
    const src = path.join(root, '相册A', '2.jpg');
    copyImages([src], path.join(root, '相册B'));
    expect(fs.existsSync(src)).toBe(true);
    expect(fs.existsSync(path.join(root, '相册B', '2.jpg'))).toBe(true);
  });

  it('createAlbum + renameAlbum', () => {
    createAlbum('新建相册');
    expect(fs.existsSync(path.join(root, '新建相册'))).toBe(true);
    renameAlbum('新建相册', '重命名后');
    expect(fs.existsSync(path.join(root, '重命名后'))).toBe(true);
  });

  it('listAlbums 列出顶级非 .lumibox 文件夹', () => {
    const albums = listAlbums();
    expect(albums.some((a) => a.name === '相册A')).toBe(true);
    expect(albums.some((a) => a.name === '.lumibox')).toBe(false);
  });

  it('moveToTrash 后 restoreFromTrash 恢复原位', () => {
    const file = path.join(root, '相册A', '1.jpg');
    const { trashName } = moveToTrash(file);
    expect(fs.existsSync(file)).toBe(false);
    restoreFromTrash(trashName, file);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('IMAGE_EXTENSIONS 包含常见格式', () => {
    expect(IMAGE_EXTENSIONS.has('.jpg')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.png')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.txt')).toBe(false);
  });
});

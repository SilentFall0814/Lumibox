// tests/main/scanner.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setLibraryRoot } from '../../src/main/services/path-guard';
import { openDatabase, closeDatabase, initSchema, getImageByPath } from '../../src/main/services/database';
import {
  indexImage,
  indexImageAsync,
  collectMediaFiles,
  __resetForTesting,
  __setSharpLoaderForTest
} from '../../src/main/services/scanner';
import { createSharpMock } from './helpers/native-mocks';

describe('scanner collectMediaFiles', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-scan-'));
    setLibraryRoot(root);
  });

  afterEach(() => {
    __resetForTesting();
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('递归遍历目录并收集媒体文件', () => {
    fs.mkdirSync(path.join(root, '相册A', '子目录'), { recursive: true });
    fs.writeFileSync(path.join(root, '相册A', '1.jpg'), 'img');
    fs.writeFileSync(path.join(root, '相册A', '子目录', '2.png'), 'img');
    fs.writeFileSync(path.join(root, '相册A', 'readme.txt'), 'txt');

    const files = collectMediaFiles(root);
    expect(files.length).toBe(2);
    expect(files.some((f) => f.endsWith('1.jpg'))).toBe(true);
    expect(files.some((f) => f.endsWith('2.png'))).toBe(true);
  });

  it('跳过 .lumibox 目录', () => {
    fs.mkdirSync(path.join(root, '.lumibox', 'cache'), { recursive: true });
    fs.writeFileSync(path.join(root, '.lumibox', 'cache', 'thumb.jpg'), 'cache');
    fs.writeFileSync(path.join(root, 'photo.jpg'), 'img');

    const files = collectMediaFiles(root);
    expect(files.length).toBe(1);
    expect(files[0]).toContain('photo.jpg');
  });

  it('空目录返回空数组', () => {
    fs.mkdirSync(path.join(root, '空相册'), { recursive: true });
    const files = collectMediaFiles(root);
    expect(files).toEqual([]);
  });
});

describe('scanner indexImage', () => {
  let root: string;
  let dbPath: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-scan-'));
    setLibraryRoot(root);
    fs.mkdirSync(path.join(root, '.lumibox'), { recursive: true });
    dbPath = path.join(root, '.lumibox', 'db.sqlite');
    openDatabase(dbPath);
    initSchema();
  });

  afterEach(() => {
    __resetForTesting();
    closeDatabase();
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('写入图片到数据库', () => {
    const abs = path.join(root, 'photo.jpg');
    fs.writeFileSync(abs, 'img');
    indexImage(abs);
    const record = getImageByPath('photo.jpg');
    expect(record).not.toBeNull();
    expect(record!.name).toBe('photo.jpg');
    expect(record!.type).toBe('image');
  });

  it('已存在的路径不重复写入', () => {
    const abs = path.join(root, 'photo.jpg');
    fs.writeFileSync(abs, 'img');
    indexImage(abs);
    indexImage(abs);
    // getImageByPath 只返回一条(INSERT OR IGNORE)
    const record = getImageByPath('photo.jpg');
    expect(record).not.toBeNull();
  });

  it('视频文件写入 type=video', () => {
    const abs = path.join(root, 'clip.mp4');
    fs.writeFileSync(abs, 'video');
    indexImage(abs);
    const record = getImageByPath('clip.mp4');
    expect(record).not.toBeNull();
    expect(record!.type).toBe('video');
  });
});

describe('scanner indexImageAsync', () => {
  let root: string;
  let dbPath: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-scan-'));
    setLibraryRoot(root);
    fs.mkdirSync(path.join(root, '.lumibox'), { recursive: true });
    dbPath = path.join(root, '.lumibox', 'db.sqlite');
    openDatabase(dbPath);
    initSchema();
    __resetForTesting();
  });

  afterEach(() => {
    __resetForTesting();
    __setSharpLoaderForTest(null);
    closeDatabase();
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('图片:用 sharp 读取宽高并写入 DB', async () => {
    const abs = path.join(root, 'photo.jpg');
    fs.writeFileSync(abs, 'img');
    const { sharp } = createSharpMock({ metadata: { width: 4000, height: 3000 } });
    __setSharpLoaderForTest(() => sharp);

    await indexImageAsync(abs);
    const record = getImageByPath('photo.jpg');
    expect(record).not.toBeNull();
    expect(record!.width).toBe(4000);
    expect(record!.height).toBe(3000);
  });

  it('sharp 抛异常不 crash(宽高不写入)', async () => {
    const abs = path.join(root, 'photo.jpg');
    fs.writeFileSync(abs, 'img');
    const { sharp } = createSharpMock({ throw: new Error('sharp fail') });
    __setSharpLoaderForTest(() => sharp);

    // 不应抛出异常
    await indexImageAsync(abs);
    const record = getImageByPath('photo.jpg');
    expect(record).not.toBeNull();
    // sharp 失败时宽高不写入(数据库返回 null)
    expect(record!.width).toBeFalsy();
  });

  it('文件不存在不 crash', async () => {
    await indexImageAsync(path.join(root, 'nonexistent.jpg'));
    // 不应抛出异常,数据库无记录
    expect(getImageByPath('nonexistent.jpg')).toBeNull();
  });
});

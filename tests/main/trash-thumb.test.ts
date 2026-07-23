// tests/main/trash-thumb.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setLibraryRoot } from '../../src/main/services/path-guard';
import { openDatabase, closeDatabase, initSchema, insertTrash } from '../../src/main/services/database';
import {
  getTrashThumbnail,
  clearTrashThumbCache,
  __resetForTesting,
  __setFfmpegPathLoaderForTest,
  __setFfmpegLibLoaderForTest,
  __setSharpLoaderForTest
} from '../../src/main/services/trash-thumb';
import { createFfmpegLibMock, createSharpMock, FFMPEG_PATH_MOCK } from './helpers/native-mocks';

describe('trash-thumb getTrashThumbnail', () => {
  let root: string;
  let dbPath: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-tt-'));
    setLibraryRoot(root);
    fs.mkdirSync(path.join(root, '.lumibox', 'trash'), { recursive: true });
    dbPath = path.join(root, '.lumibox', 'db.sqlite');
    openDatabase(dbPath);
    initSchema();
    __resetForTesting();
    __setFfmpegPathLoaderForTest(() => FFMPEG_PATH_MOCK);
  });

  afterEach(() => {
    clearTrashThumbCache();
    __resetForTesting();
    __setFfmpegPathLoaderForTest(null);
    __setFfmpegLibLoaderForTest(null);
    __setSharpLoaderForTest(null);
    closeDatabase();
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('DB 无记录返回 null', async () => {
    const result = await getTrashThumbnail(99999);
    expect(result).toBeNull();
  });

  it('trash 文件不存在返回 null', async () => {
    const trashId = insertTrash({ imageId: null, originalPath: 'photo.jpg', trashName: 'photo_123.jpg', size: 100 });
    const result = await getTrashThumbnail(trashId);
    expect(result).toBeNull();
  });

  it('图片缩略图:用 sharp 生成 JPEG', async () => {
    // 在 trash 目录创建假图片文件
    const trashName = 'photo_123.jpg';
    const trashPath = path.join(root, '.lumibox', 'trash', trashName);
    fs.writeFileSync(trashPath, 'fake-image');

    const trashId = insertTrash({ imageId: null, originalPath: 'photo.jpg', trashName, size: 100 });
    const fakeJpg = Buffer.from('fake-jpg');
    const { sharp } = createSharpMock({ jpgBuffer: fakeJpg });
    __setSharpLoaderForTest(() => sharp);

    const result = await getTrashThumbnail(trashId);
    expect(result).not.toBeNull();
    expect(result!.buffer).toEqual(fakeJpg);
    expect(result!.mime).toBe('image/jpeg');
  });

  it('视频缩略图:用 ffmpeg 抓帧 + sharp 压缩', async () => {
    const trashName = 'clip_456.mp4';
    const trashPath = path.join(root, '.lumibox', 'trash', trashName);
    fs.writeFileSync(trashPath, 'fake-video');

    const trashId = insertTrash({ imageId: null, originalPath: 'clip.mp4', trashName, size: 100 });
    const fakePng = Buffer.from('fake-png');
    const fakeJpg = Buffer.from('fake-jpg');
    const { ffmpegLib } = createFfmpegLibMock({ pngBuffer: fakePng });
    const { sharp } = createSharpMock({ jpgBuffer: fakeJpg });
    __setFfmpegLibLoaderForTest(() => ffmpegLib);
    __setSharpLoaderForTest(() => sharp);

    const result = await getTrashThumbnail(trashId);
    expect(result).not.toBeNull();
    expect(result!.buffer).toEqual(fakeJpg);
  });

  it('缓存命中:第二次不重新生成', async () => {
    const trashName = 'photo_789.jpg';
    const trashPath = path.join(root, '.lumibox', 'trash', trashName);
    fs.writeFileSync(trashPath, 'fake-image');

    const trashId = insertTrash({ imageId: null, originalPath: 'photo.jpg', trashName, size: 100 });
    const { sharp } = createSharpMock({ jpgBuffer: Buffer.from('jpg1') });
    __setSharpLoaderForTest(() => sharp);

    await getTrashThumbnail(trashId);
    expect(sharp).toHaveBeenCalledTimes(1);

    // 第二次应命中缓存
    await getTrashThumbnail(trashId);
    expect(sharp).toHaveBeenCalledTimes(1);
  });

  it('sharp 抛异常 → 返回 null', async () => {
    const trashName = 'photo_err.jpg';
    const trashPath = path.join(root, '.lumibox', 'trash', trashName);
    fs.writeFileSync(trashPath, 'fake-image');

    const trashId = insertTrash({ imageId: null, originalPath: 'photo.jpg', trashName, size: 100 });
    const { sharp } = createSharpMock({ throw: new Error('sharp crash') });
    __setSharpLoaderForTest(() => sharp);

    const result = await getTrashThumbnail(trashId);
    expect(result).toBeNull();
  });
});

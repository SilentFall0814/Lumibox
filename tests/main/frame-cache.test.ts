// tests/main/frame-cache.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setLibraryRoot } from '../../src/main/services/path-guard';
import { openDatabase, closeDatabase, initSchema, insertImage, updateVideoMeta } from '../../src/main/services/database';
import {
  getVideoFrame,
  clearFrameCache,
  __resetForTesting,
  __setFfmpegPathLoaderForTest,
  __setFfmpegLibLoaderForTest,
  __setSharpLoaderForTest
} from '../../src/main/services/frame-cache';
import { createFfmpegLibMock, createSharpMock, FFMPEG_PATH_MOCK } from './helpers/native-mocks';

describe('frame-cache getVideoFrame', () => {
  let root: string;
  let dbPath: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-fc-'));
    setLibraryRoot(root);
    fs.mkdirSync(path.join(root, '.lumibox'), { recursive: true });
    dbPath = path.join(root, '.lumibox', 'db.sqlite');
    openDatabase(dbPath);
    initSchema();
    __resetForTesting();
    __setFfmpegPathLoaderForTest(() => FFMPEG_PATH_MOCK);
  });

  afterEach(() => {
    clearFrameCache();
    __resetForTesting();
    __setFfmpegPathLoaderForTest(null);
    __setFfmpegLibLoaderForTest(null);
    __setSharpLoaderForTest(null);
    closeDatabase();
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('DB 无记录时返回 null', async () => {
    const result = await getVideoFrame(99999);
    expect(result).toBeNull();
  });

  it('非视频类型返回 null', async () => {
    const id = insertImage({ path: 'img.jpg', name: 'img.jpg', createdAt: Date.now(), size: 100, type: 'image' });
    const result = await getVideoFrame(id);
    expect(result).toBeNull();
  });

  it('缓存命中:第二次调用不重新生成', async () => {
    const fakePng = Buffer.from('fake-png');
    const fakeJpg = Buffer.from('fake-jpg');
    const { ffmpegLib } = createFfmpegLibMock({ pngBuffer: fakePng });
    const { sharp } = createSharpMock({ jpgBuffer: fakeJpg });
    __setFfmpegLibLoaderForTest(() => ffmpegLib);
    __setSharpLoaderForTest(() => sharp);

    const videoPath = path.join(root, 'clip.mp4');
    fs.writeFileSync(videoPath, '');
    const id = insertImage({ path: 'clip.mp4', name: 'clip.mp4', createdAt: Date.now(), size: 100, type: 'video' });
    updateVideoMeta(id, { duration: 60, fps: 30, bitrate: 1000, width: 1920, height: 1080, videoThumbnailTime: 5 });

    const r1 = await getVideoFrame(id);
    expect(r1).not.toBeNull();
    expect(r1!.buffer).toEqual(fakeJpg);
    expect(ffmpegLib).toHaveBeenCalledTimes(1);

    // 第二次应命中缓存,不再调用 ffmpeg
    const r2 = await getVideoFrame(id);
    expect(r2).not.toBeNull();
    expect(ffmpegLib).toHaveBeenCalledTimes(1);
  });

  it('ffmpeg 返回空数据(chunks 为空)→ 结果 null', async () => {
    const { ffmpegLib } = createFfmpegLibMock({ pngBuffer: Buffer.alloc(0) });
    __setFfmpegLibLoaderForTest(() => ffmpegLib);

    const videoPath = path.join(root, 'clip.mp4');
    fs.writeFileSync(videoPath, '');
    const id = insertImage({ path: 'clip.mp4', name: 'clip.mp4', createdAt: Date.now(), size: 100, type: 'video' });
    updateVideoMeta(id, { duration: 60, fps: 30, bitrate: 1000, width: 1920, height: 1080, videoThumbnailTime: 5 });

    const result = await getVideoFrame(id);
    expect(result).toBeNull();
  });

  it('ffmpeg 报错 → 返回 null', async () => {
    const { ffmpegLib } = createFfmpegLibMock({ error: new Error('ffmpeg crash') });
    __setFfmpegLibLoaderForTest(() => ffmpegLib);

    const videoPath = path.join(root, 'clip.mp4');
    fs.writeFileSync(videoPath, '');
    const id = insertImage({ path: 'clip.mp4', name: 'clip.mp4', createdAt: Date.now(), size: 100, type: 'video' });
    updateVideoMeta(id, { duration: 60, fps: 30, bitrate: 1000, width: 1920, height: 1080, videoThumbnailTime: 5 });

    const result = await getVideoFrame(id);
    expect(result).toBeNull();
  });

  it('sharp 压缩失败 → 退回返回 PNG', async () => {
    const fakePng = Buffer.from('fallback-png');
    const { ffmpegLib } = createFfmpegLibMock({ pngBuffer: fakePng });
    const { sharp } = createSharpMock({ throw: new Error('sharp error') });
    __setFfmpegLibLoaderForTest(() => ffmpegLib);
    __setSharpLoaderForTest(() => sharp);

    const videoPath = path.join(root, 'clip.mp4');
    fs.writeFileSync(videoPath, '');
    const id = insertImage({ path: 'clip.mp4', name: 'clip.mp4', createdAt: Date.now(), size: 100, type: 'video' });
    updateVideoMeta(id, { duration: 60, fps: 30, bitrate: 1000, width: 1920, height: 1080, videoThumbnailTime: 5 });

    const result = await getVideoFrame(id);
    expect(result).not.toBeNull();
    expect(result!.buffer).toEqual(fakePng);
  });
});

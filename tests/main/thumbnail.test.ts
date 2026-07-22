// tests/main/thumbnail.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setLibraryRoot } from '../../src/main/services/path-guard';
import { getOrCreateThumbnail } from '../../src/main/services/thumbnail';

describe('thumbnail getOrCreateThumbnail', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-thumb-'));
    setLibraryRoot(root);
  });

  afterEach(() => {
    setLibraryRoot(null);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('图片 + 有效 imageId → thumb 协议 URL', async () => {
    const abs = path.join(root, 'photo.jpg');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs, { imageId: 42 });
    expect(url).toBe('lumibox://thumb/42');
  });

  it('图片 + imageId=0 → 退回 img 协议', async () => {
    const abs = path.join(root, 'photo.png');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs, { imageId: 0 });
    expect(url).toBe('lumibox://img/photo.png');
  });

  it('图片 + 无 imageId → img 协议', async () => {
    const abs = path.join(root, 'photo.jpg');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs);
    expect(url).toBe('lumibox://img/photo.jpg');
  });

  it('视频 + 有效 imageId → vframe 协议 URL', async () => {
    const abs = path.join(root, 'clip.mp4');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs, { imageId: 7 });
    expect(url).toBe('lumibox://vframe/7');
  });

  it('视频 + imageId=0 → 退回 img 协议', async () => {
    const abs = path.join(root, 'clip.mp4');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs, { imageId: 0 });
    expect(url).toBe('lumibox://img/clip.mp4');
  });

  it('视频 + 无 imageId → img 协议', async () => {
    const abs = path.join(root, 'clip.mp4');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs);
    expect(url).toBe('lumibox://img/clip.mp4');
  });

  it('子目录路径正确编码', async () => {
    const subDir = path.join(root, '相册A');
    fs.mkdirSync(subDir);
    const abs = path.join(subDir, 'photo.jpg');
    fs.writeFileSync(abs, '');
    const url = await getOrCreateThumbnail(abs, { imageId: 1 });
    expect(url).toBe('lumibox://thumb/1');
  });

  it('路径越界抛出错误', async () => {
    await expect(
      getOrCreateThumbnail('C:\\Windows\\System32\\photo.jpg', { imageId: 1 })
    ).rejects.toThrow('路径越界');
  });
});

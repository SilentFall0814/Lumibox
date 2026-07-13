import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { setLibraryRoot, assertWithinLibrary, isInsideLumibox } from '../../src/main/services/path-guard';

describe('path-guard', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lumibox-test-'));
    setLibraryRoot(tmpRoot);
  });

  afterEach(() => {
    setLibraryRoot(null);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('允许库根内的路径', () => {
    const sub = path.join(tmpRoot, '相册A');
    expect(() => assertWithinLibrary(sub)).not.toThrow();
  });

  it('拒绝越界路径(包含 ..)', () => {
    const evil = path.join(tmpRoot, '..', '..', 'etc', 'passwd');
    expect(() => assertWithinLibrary(evil)).toThrow('路径越界');
  });

  it('拒绝库根外的绝对路径', () => {
    expect(() => assertWithinLibrary('C:\\Windows\\System32')).toThrow('路径越界');
  });

  it('识别 .lumibox 内部路径', () => {
    const lumibox = path.join(tmpRoot, '.lumibox', 'cache', 'x.webp');
    expect(isInsideLumibox(lumibox)).toBe(true);
  });

  it('非 .lumibox 路径不被识别为内部', () => {
    expect(isInsideLumibox(path.join(tmpRoot, 'photo.jpg'))).toBe(false);
  });
});

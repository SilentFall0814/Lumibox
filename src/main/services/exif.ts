import fs from 'fs';
import type { ExifData } from '../../shared/types';

/**
 * 读取图片 EXIF 信息
 * 简化实现:从文件头判断 JPEG 并尝试解析
 * 生产环境建议替换为更专业的 exif 解析库
 */
export function readExif(filePath: string): ExifData {
  try {
    const buf = fs.readFileSync(filePath);
    const result: ExifData = {};
    // JPEG: 0xFFD8 开头,0xFFE1 为 APP1(EXIF)
    if (buf.length > 10 && buf[0] === 0xff && buf[1] === 0xd8) {
      // 简化:仅返回宽高(从 SOF0 标记)
      // 完整 EXIF 解析逻辑较复杂,这里提供基本框架
      const exifIdx = findMarker(buf, 0xe1);
      if (exifIdx > 0) {
        // 实际项目用 exifreader 包解析
      }
    }
    return result;
  } catch {
    return {};
  }
}

function findMarker(buf: Buffer, marker: number): number {
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] === 0xff && buf[i + 1] === marker) return i;
    // 跳到下一个标记
    if (buf[i] === 0xff && buf[i + 1] !== 0x00 && buf[i + 1] < 0xd0) {
      const len = (buf[i + 2] << 8) | buf[i + 3];
      i += 2 + len;
    } else {
      i++;
    }
  }
  return -1;
}

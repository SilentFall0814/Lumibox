import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getLibraryRoot, assertWithinLibrary } from './path-guard';
import { isVideoFile } from './fs-ops';

const THUMB_SIZE = 256;
const THUMB_QUALITY = 80;

export function getCacheKey(srcAbsolutePath: string): string {
  return crypto.createHash('sha256').update(srcAbsolutePath).digest('hex');
}

export function getCachePath(srcAbsolutePath: string): string {
  const root = getLibraryRoot();
  return path.join(root, '.lumibox', 'cache', `${getCacheKey(srcAbsolutePath)}.webp`);
}

export async function getOrCreateThumbnail(srcAbsolutePath: string): Promise<string> {
  assertWithinLibrary(srcAbsolutePath);
  const cachePath = getCachePath(srcAbsolutePath);
  if (fs.existsSync(cachePath)) {
    return readFileAsDataUrl(cachePath);
  }
  await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });

  if (isVideoFile(srcAbsolutePath)) {
    // 视频用 ffmpeg 截取第 1 秒作为缩略图
    await generateVideoThumbnail(srcAbsolutePath, cachePath);
  } else {
    // 图片用 sharp 生成缩略图
    const sharp = require('sharp');
    await sharp(srcAbsolutePath)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toFile(cachePath);
  }
  return readFileAsDataUrl(cachePath);
}

/** 用 ffmpeg 截取视频第 1 秒画面作为缩略图 */
async function generateVideoThumbnail(srcPath: string, outPath: string): Promise<void> {
  const ffmpegPath = require('ffmpeg-static');
  const ffmpeg = require('fluent-ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegPath);
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(outPath),
        folder: path.dirname(outPath),
        size: `${THUMB_SIZE}x${THUMB_SIZE}`
      })
      .on('end', () => {
        // ffmpeg 默认输出 png,用 sharp 转成 webp 减小体积
        const pngPath = outPath.replace(/\.webp$/, '.png');
        if (fs.existsSync(pngPath)) {
          try {
            const sharp = require('sharp');
            sharp(pngPath)
              .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: THUMB_QUALITY })
              .toFile(outPath)
              .then(() => {
                fs.unlinkSync(pngPath);
                resolve();
              })
              .catch(() => {
                // 转换失败则直接用 png
                fs.renameSync(pngPath, outPath);
                resolve();
              });
          } catch {
            fs.renameSync(pngPath, outPath);
            resolve();
          }
        } else {
          resolve();
        }
      })
      .on('error', (err: Error) => reject(err));
  });
}

function readFileAsDataUrl(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

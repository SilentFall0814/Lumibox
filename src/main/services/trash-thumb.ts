import fs from 'fs';
import path from 'path';
import { getTrashItem } from './database';
import { getLibraryRoot } from './path-guard';
import { VIDEO_EXTENSIONS } from './fs-ops';
import { createLogger } from './logger';

const logger = createLogger('trash-thumb');

/**
 * 回收站缩略图内存缓存
 * - 删除到回收站后,images 表记录已删除,无法用 imageId 查询
 * - 这里直接从 trash 目录读取文件(.lumibox/trash/<trashName>),用 sharp / ffmpeg 生成缩略图
 * - LRU 策略:超过 MAX_ENTRIES 时淘汰最久未访问的项
 */

const MAX_ENTRIES = 200; // 最多缓存 200 张回收站缩略图
const THUMB_WIDTH = 400; // 缩略图宽度

const cache = new Map<number, { buffer: Buffer; ts: number }>();
const accessOrder = new Map<number, number>();

// === 可测试性:原生模块加载器(模块级变量,测试可注入) ===
type FfmpegPathLoader = () => string;
type FfmpegLibLoader = () => any;
type SharpLoader = () => any;

// 默认通过 require 加载原生模块,测试时可注入 mock
let ffmpegPathLoader: FfmpegPathLoader | null = () => require('ffmpeg-static');
let ffmpegLibLoader: FfmpegLibLoader | null = () => require('fluent-ffmpeg');
let sharpLoader: SharpLoader | null = () => require('sharp');

/** 测试用:注入 ffmpeg-static 路径加载器(传 null 恢复默认) */
export function __setFfmpegPathLoaderForTest(loader: FfmpegPathLoader | null): void {
  ffmpegPathLoader = loader;
}

/** 测试用:注入 fluent-ffmpeg 库加载器(传 null 恢复默认) */
export function __setFfmpegLibLoaderForTest(loader: FfmpegLibLoader | null): void {
  ffmpegLibLoader = loader;
}

/** 测试用:注入 sharp 库加载器(传 null 恢复默认) */
export function __setSharpLoaderForTest(loader: SharpLoader | null): void {
  sharpLoader = loader;
}

/** 测试用:重置缓存和访问顺序(不影响加载器,加载器需单独复位) */
export function __resetForTesting(): void {
  cache.clear();
  accessOrder.clear();
}

/**
 * 获取回收站项目的缩略图 Buffer
 * - 命中内存缓存:直接返回
 * - 未命中:从 trash 目录读文件,图片用 sharp,视频用 ffmpeg 抓帧
 */
export async function getTrashThumbnail(trashId: number): Promise<{ buffer: Buffer; mime: string } | null> {
  // 1. 内存缓存命中
  const cached = cache.get(trashId);
  if (cached) {
    accessOrder.set(trashId, Date.now());
    return { buffer: cached.buffer, mime: 'image/jpeg' };
  }

  // 2. 未命中:查数据库获取回收站项目信息
  const item = getTrashItem(trashId);
  if (!item) return null;

  const root = getLibraryRoot();
  const trashPath = path.join(root, '.lumibox', 'trash', item.trashName);
  if (!fs.existsSync(trashPath)) return null;

  // 3. 根据扩展名选择缩略图生成方式
  const ext = path.extname(item.trashName).toLowerCase();
  try {
    const buffer = VIDEO_EXTENSIONS.has(ext)
      ? await generateVideoThumb(trashPath)
      : await generateImageThumb(trashPath);
    if (!buffer) return null;

    // 4. 存入内存缓存,执行 LRU 淘汰
    if (cache.size >= MAX_ENTRIES) {
      evictOldest();
    }
    cache.set(trashId, { buffer, ts: Date.now() });
    accessOrder.set(trashId, Date.now());

    return { buffer, mime: 'image/jpeg' };
  } catch (e) {
    logger.error('生成缩略图失败', { trashPath, err: String(e) });
    return null;
  }
}

/** 图片缩略图:用 sharp 异步生成(不阻塞主进程) */
async function generateImageThumb(absPath: string): Promise<Buffer | null> {
  const sharp = sharpLoader!();
  // sharp 会根据文件签名自动识别格式(包括 HEIC/WEBP 等)
  const buffer = await sharp(absPath)
    .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
  return buffer;
}

/** 视频缩略图:用 ffmpeg 抓取第 1 秒帧 + sharp 压缩 */
async function generateVideoThumb(absPath: string): Promise<Buffer | null> {
  const ffmpegPath = ffmpegPathLoader!();
  const ffmpeg = ffmpegLibLoader!();
  // 修复:打包后 ffmpeg-static 返回的路径指向 app.asar 内部,
  // 但 child_process 无法从 asar 虚拟文件系统执行 .exe 文件。
  // 必须将路径中的 app.asar 替换为 app.asar.unpacked,指向真实文件系统路径。
  const realFfmpegPath = typeof ffmpegPath === 'string' && ffmpegPath.includes('app.asar')
    ? ffmpegPath.replace('app.asar', 'app.asar.unpacked')
    : ffmpegPath;
  ffmpeg.setFfmpegPath(realFfmpegPath);

  return new Promise<Buffer | null>((resolve) => {
    const chunks: Buffer[] = [];
    try {
      const cmd = ffmpeg(absPath);
      cmd
        .seekInput(1) // 抓取第 1 秒
        .frames(1)
        .format('image2pipe')
        .outputOptions('-vcodec', 'png')
        .on('end', async () => {
          if (chunks.length === 0) {
            resolve(null);
            return;
          }
          const pngBuffer = Buffer.concat(chunks);
          try {
            const sharp = sharpLoader!();
            const jpgBuffer = await sharp(pngBuffer)
              .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80, progressive: true })
              .toBuffer();
            resolve(jpgBuffer);
          } catch (e) {
            logger.warn('sharp 压缩失败,返回 PNG', { err: String(e) });
            resolve(pngBuffer);
          }
        })
        .on('error', (e: Error) => { logger.warn('ffmpeg 流错误', { absPath, err: e.message }); resolve(null); });

      const stream = cmd.pipe();
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', (e: Error) => { logger.warn('ffmpeg 流错误', { absPath, err: e.message }); resolve(null); });
    } catch (e) {
      logger.warn('ffmpeg 抓帧异常', { absPath, err: String(e) });
      resolve(null);
    }
  });
}

/** LRU 淘汰:删除最久未访问的项 */
function evictOldest(): void {
  let oldestId: number | null = null;
  let oldestTs = Infinity;
  for (const [id, ts] of accessOrder.entries()) {
    if (ts < oldestTs) {
      oldestTs = ts;
      oldestId = id;
    }
  }
  if (oldestId !== null) {
    cache.delete(oldestId);
    accessOrder.delete(oldestId);
  }
}

/** 清空内存缓存(应用退出时调用) */
export function clearTrashThumbCache(): void {
  cache.clear();
  accessOrder.clear();
}

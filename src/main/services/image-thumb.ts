import fs from 'fs';
import path from 'path';
import { getImageById } from './database';
import { getLibraryRoot } from './path-guard';
import { createLogger } from './logger';

const logger = createLogger('image-thumb');

/**
 * 图片缩略图内存缓存(零磁盘文件)
 * - 主进程维护 Map<imageId, Buffer>,首次请求时用 sharp 异步生成缩略图
 * - LRU 策略:超过 MAX_ENTRIES 时淘汰最久未访问的项
 * - 应用退出后内存自动释放
 *
 * 性能:用 sharp(异步,基于 libvips)代替 nativeImage(同步阻塞),
 * 避免启动时几十张图片同时解码导致主进程卡死、部分缩略图超时不显示
 */

const MAX_ENTRIES = 400; // 最多缓存 400 张缩略图,约 12MB 内存(每张约 30KB)
const THUMB_WIDTH = 400; // 缩略图宽度
const MAX_CONCURRENT = 4; // 最大并发解码数,避免同时解码太多图片耗尽内存/资源

const cache = new Map<number, { buffer: Buffer; ts: number }>();
const accessOrder = new Map<number, number>(); // imageId -> 最后访问时间戳

// ============ 并发控制(简单信号量)============
let runningCount = 0;
const waitQueue: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (runningCount < MAX_CONCURRENT) {
    runningCount++;
    return;
  }
  // 超过并发上限,排队等待
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  runningCount++;
}

function releaseSlot(): void {
  runningCount--;
  const next = waitQueue.shift();
  if (next) next();
}

/**
 * 获取图片缩略图 Buffer
 * - 命中内存缓存:直接返回
 * - 未命中:用 sharp 异步生成缩略图(不阻塞主进程),存入缓存
 */
export async function getImageThumbnail(imageId: number): Promise<{ buffer: Buffer; mime: string } | null> {
  // 1. 内存缓存命中
  const cached = cache.get(imageId);
  if (cached) {
    accessOrder.set(imageId, Date.now());
    return { buffer: cached.buffer, mime: 'image/jpeg' };
  }

  // 2. 未命中:查数据库获取图片信息
  const img = getImageById(imageId);
  if (!img || img.type !== 'image') return null;

  const root = getLibraryRoot();
  const absPath = path.join(root, img.path);
  if (!fs.existsSync(absPath)) return null;

  // 3. 获取并发槽位(避免同时解码太多图片)
  await acquireSlot();
  try {
    // 4. 再次检查缓存(可能在等待期间已被其他请求填充)
    const cachedAfterWait = cache.get(imageId);
    if (cachedAfterWait) {
      accessOrder.set(imageId, Date.now());
      return { buffer: cachedAfterWait.buffer, mime: 'image/jpeg' };
    }

    // 5. 用 sharp 异步生成缩略图
    const buffer = await generateThumb(absPath);
    if (!buffer) return null;

    // 6. 存入内存缓存,执行 LRU 淘汰
    if (cache.size >= MAX_ENTRIES) {
      evictOldest();
    }
    cache.set(imageId, { buffer, ts: Date.now() });
    accessOrder.set(imageId, Date.now());

    return { buffer, mime: 'image/jpeg' };
  } catch (e) {
    logger.error('生成缩略图失败', { absPath, err: String(e) });
    return null;
  } finally {
    releaseSlot();
  }
}

/** 用 sharp 生成缩略图 JPEG Buffer(异步,不阻塞主进程) */
async function generateThumb(absPath: string): Promise<Buffer | null> {
  const sharp = require('sharp');
  // sharp 会根据文件签名自动识别格式(包括 HEIC/WEBP/JPEG/PNG/GIF/BMP/TIFF 等)
  // resize 保持宽高比,jpeg quality 80 平衡质量与大小
  const buffer = await sharp(absPath)
    .resize(THUMB_WIDTH, THUMB_WIDTH, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
  return buffer;
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

/** 清空内存缓存(库切换/应用退出时调用) */
export function clearImageThumbCache(): void {
  cache.clear();
  accessOrder.clear();
}

import { getImageById } from './database';
import { getLibraryRoot } from './path-guard';
import { probeVideoMetadata, pickRandomTimestamp } from './video-probe';
import path from 'path';
import { updateVideoMeta } from './database';
import { createLogger } from './logger';

const logger = createLogger('frame-cache');

/**
 * 视频帧内存缓存(零磁盘文件)
 * - 主进程维护 Map<imageId, Buffer>,首次抓帧后存内存
 * - LRU 策略:超过 MAX_ENTRIES 时淘汰最久未访问的项
 * - 应用退出后内存自动释放
 */

const MAX_ENTRIES = 200; // 最多缓存 200 个视频帧,约占用 100MB 内存(每帧约 500KB)

const cache = new Map<number, { buffer: Buffer; ts: number }>();
const accessOrder = new Map<number, number>(); // imageId -> 最后访问时间戳

/**
 * 获取视频帧 Buffer
 * - 命中内存缓存:直接返回
 * - 未命中:调用 ffmpeg 抓帧 + sharp 压缩,存入内存后返回
 */
export async function getVideoFrame(imageId: number): Promise<{ buffer: Buffer; mime: string } | null> {
  // 1. 内存缓存命中
  const cached = cache.get(imageId);
  if (cached) {
    accessOrder.set(imageId, Date.now());
    return { buffer: cached.buffer, mime: 'image/jpeg' };
  }

  // 2. 未命中:查数据库获取视频信息
  const img = getImageById(imageId);
  if (!img || img.type !== 'video') return null;

  const root = getLibraryRoot();
  const absPath = path.join(root, img.path);

  // 3. 确定抓帧时间戳:优先用数据库已存的,否则实时 probe
  let timestamp = img.videoThumbnailTime ?? 1;
  let duration = img.duration;

  // 若数据库缺失时长,实时 probe 一次,顺便补全元数据
  if (duration == null || img.fps == null || img.bitrate == null || img.width == null) {
    try {
      const probe = await probeVideoMetadata(absPath);
      duration = probe.duration;
      // 计算稳定的时间戳
      timestamp = pickRandomTimestamp(absPath, probe.duration);
      // 异步写回数据库,避免下次再 probe
      try {
        updateVideoMeta(imageId, {
          width: probe.width,
          height: probe.height,
          duration: probe.duration,
          fps: probe.fps,
          bitrate: probe.bitrate,
          videoThumbnailTime: timestamp
        });
      } catch (e) { logger.warn('写回视频元数据失败', { imageId, err: String(e) }); }
    } catch (e) {
      logger.warn('probe 失败,用默认时间戳', { absPath, err: String(e) });
      timestamp = 1;
    }
  } else if (img.videoThumbnailTime == null) {
    timestamp = pickRandomTimestamp(absPath, duration);
  }

  // 4. 调用 ffmpeg + sharp 抓帧并压缩
  const buffer = await captureFrame(absPath, timestamp);
  if (!buffer) return null;

  // 5. 存入内存缓存,执行 LRU 淘汰
  if (cache.size >= MAX_ENTRIES) {
    evictOldest();
  }
  cache.set(imageId, { buffer, ts: Date.now() });
  accessOrder.set(imageId, Date.now());

  return { buffer, mime: 'image/jpeg' };
}

/** 调用 ffmpeg 抓帧,用 sharp 压缩为 JPEG Buffer */
async function captureFrame(absPath: string, timestamp: number): Promise<Buffer | null> {
  const ffmpegPath = require('ffmpeg-static');
  const ffmpeg = require('fluent-ffmpeg');
  // 修复:打包后 ffmpeg-static 返回的路径指向 app.asar 内部,
  // 但 child_process 无法从 asar 虚拟文件系统执行 .exe 文件。
  // 必须将路径中的 app.asar 替换为 app.asar.unpacked,指向真实文件系统路径。
  const realFfmpegPath = typeof ffmpegPath === 'string' && ffmpegPath.includes('app.asar')
    ? ffmpegPath.replace('app.asar', 'app.asar.unpacked')
    : ffmpegPath;
  ffmpeg.setFfmpegPath(realFfmpegPath);

  // 用临时管道接收 ffmpeg 输出 PNG,再喂给 sharp 压缩
  return new Promise<Buffer | null>((resolve) => {
    const chunks: Buffer[] = [];
    try {
      const cmd = ffmpeg(absPath);
      cmd
        .seekInput(timestamp)
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
            const sharp = require('sharp');
            const jpgBuffer = await sharp(pngBuffer)
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80, progressive: true })
              .toBuffer();
            resolve(jpgBuffer);
          } catch (e) {
            logger.warn('sharp 压缩失败,返回 PNG', { err: String(e) });
            resolve(pngBuffer);
          }
        })
        .on('error', (e: Error) => { logger.warn('ffmpeg 流错误', { absPath, err: e.message }); resolve(null); });

      // 捕获 ffmpeg stdout 数据
      const stream = cmd.pipe();
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', (e: Error) => { logger.warn('ffmpeg 流错误', { absPath, err: e.message }); resolve(null); });
    } catch (e) {
      logger.warn('ffmpeg 抓帧异常', { absPath, err: String(e) });
      resolve(null);
    }
  });
}

/** LRU 淘汰:移除最久未访问的项 */
function evictOldest(): void {
  let oldestId = -1;
  let oldestTs = Infinity;
  for (const [id, ts] of accessOrder.entries()) {
    if (ts < oldestTs) {
      oldestTs = ts;
      oldestId = id;
    }
  }
  if (oldestId >= 0) {
    cache.delete(oldestId);
    accessOrder.delete(oldestId);
  }
}

/** 清空内存缓存(库切换/应用退出时调用) */
export function clearFrameCache(): void {
  cache.clear();
  accessOrder.clear();
}

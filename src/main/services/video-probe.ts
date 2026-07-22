import { createLogger } from './logger';

const logger = createLogger('video-probe');

export interface VideoProbeResult {
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  bitrate?: number;
}

// 缓存 ffprobe 可执行文件路径,避免每次调用都 require
// ffprobe-static 包导出 { path, version } 对象
let ffprobePathCache: string | null = null;

function getFfprobePath(): string | null {
  if (ffprobePathCache !== null) return ffprobePathCache;
  try {
    const ffprobeStatic = require('ffprobe-static');
    const p = ffprobeStatic?.path;
    if (p && typeof p === 'string') {
      // 修复:打包后 ffprobe-static 返回的路径指向 app.asar 内部,
      // 但 child_process 无法从 asar 虚拟文件系统执行 .exe 文件。
      // 必须将路径中的 app.asar 替换为 app.asar.unpacked,指向真实文件系统路径。
      const realPath = p.includes('app.asar')
        ? p.replace('app.asar', 'app.asar.unpacked')
        : p;
      ffprobePathCache = realPath;
      return realPath;
    }
  } catch (e) { logger.warn('加载 ffprobe-static 失败', { err: String(e) }); }
  ffprobePathCache = null;
  return null;
}

/**
 * 使用 ffprobe 读取视频元数据(分辨率/时长/帧率/码率)
 * 返回空对象表示读取失败或非视频
 */
export function probeVideoMetadata(filePath: string): Promise<VideoProbeResult> {
  return new Promise((resolve) => {
    const ffprobePath = getFfprobePath();
    if (!ffprobePath) {
      logger.error('未找到 ffprobe 可执行文件');
      resolve({});
      return;
    }
    try {
      const { execFile } = require('child_process') as typeof import('child_process');
      const args = [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate,bit_rate:format=duration,bit_rate',
        '-of', 'json',
        filePath
      ];
      execFile(ffprobePath, args, { windowsHide: true }, (err, stdout, stderr) => {
        if (err) {
          logger.warn('ffprobe 执行失败', { err: err.message });
          resolve({});
          return;
        }
        try {
          const data = JSON.parse(stdout);
          const stream = data.streams?.[0] ?? {};
          const format = data.format ?? {};
          // 解析帧率(形如 30000/1001)
          let fps: number | undefined;
          const rFrameRate: string | undefined = stream.r_frame_rate;
          if (rFrameRate && rFrameRate.includes('/')) {
            const [num, den] = rFrameRate.split('/').map(Number);
            if (den > 0) fps = num / den;
          } else if (rFrameRate) {
            fps = Number(rFrameRate);
          }
          resolve({
            width: stream.width ? Number(stream.width) : undefined,
            height: stream.height ? Number(stream.height) : undefined,
            duration: format.duration ? Number(format.duration) : undefined,
            fps: fps && Number.isFinite(fps) ? Math.round(fps * 100) / 100 : undefined,
            bitrate: (stream.bit_rate ? Number(stream.bit_rate) : undefined) ??
                     (format.bit_rate ? Number(format.bit_rate) : undefined)
          });
        } catch (e) {
          logger.warn('ffprobe 输出 JSON 解析失败', { err: String(e) });
          resolve({});
        }
      });
    } catch (e) {
      logger.warn('ffprobe 调用异常', { err: String(e) });
      resolve({});
    }
  });
}

/**
 * 在视频时长内随机取一个时间戳(秒)作为封面帧
 * - 默认在 [1秒, 总时长-1秒] 范围内随机
 * - 总时长小于 2 秒时返回 0
 * - 使用确定性种子(基于路径)避免每次刷新都换封面
 */
export function pickRandomTimestamp(filePath: string, duration?: number): number {
  if (!duration || duration < 2) return 0;
  // 用路径哈希做种子,确保同一视频每次都取同一帧(随机但稳定)
  const seed = hashString(filePath);
  const start = 1;
  const end = Math.max(start + 0.5, duration - 1);
  const rand = seededRandom(seed);
  return Math.round((start + rand * (end - start)) * 100) / 100;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): number {
  // 简单的 LCG 随机数生成器
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

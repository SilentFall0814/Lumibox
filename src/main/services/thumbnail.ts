import path from 'path';
import { getLibraryRoot, assertWithinLibrary } from './path-guard';
import { isVideoFile } from './fs-ops';

/**
 * 缩略图策略(v4,零磁盘缓存):
 * - 图片:直接返回 lumibox://img/<相对路径>,由协议层流式返回原图
 *   依赖 Chromium 浏览器 HTTP 缓存(max-age=7天)加速二次访问
 * - 视频:返回 lumibox://vframe/<imageId>,由协议层调用 ffmpeg 实时抓帧
 *   主进程内存 Map 缓存抓帧结果(Buffer),同一视频二次访问秒返回
 *
 * 优势:
 *   1. 不产生任何磁盘缓存文件,保持库目录干净
 *   2. 浏览器 HTTP 缓存 + 主进程内存缓存双重加速
 *   3. 应用退出后内存自动释放,无残留
 */

/**
 * 获取缩略图 URL
 * - 图片:返回 lumibox://img/<相对路径>
 * - 视频:返回 lumibox://vframe/<imageId>
 */
export async function getOrCreateThumbnail(
  srcAbsolutePath: string,
  options?: { videoThumbnailTime?: number; videoDuration?: number; imageId?: number }
): Promise<string> {
  assertWithinLibrary(srcAbsolutePath);
  const root = getLibraryRoot();
  const rel = path.relative(root, srcAbsolutePath).replace(/\\/g, '/');

  if (isVideoFile(srcAbsolutePath)) {
    // 视频:走 vframe 协议,主进程内存缓存抓帧结果
    const imageId = options?.imageId;
    if (imageId == null || imageId <= 0) {
      // 无 imageId 时退回到 img 协议(虽无缩略图但能加载)
      return `lumibox://img/${encodeURIComponent(rel)}`;
    }
    return `lumibox://vframe/${imageId}`;
  }

  // 图片:走 thumb 协议,主进程用 nativeImage 缩放到 400×300 JPEG(内存 LRU 缓存)
  // 避免网格视图同时加载上百张多兆原图导致卡顿
  const imageId = options?.imageId;
  if (imageId != null && imageId > 0) {
    return `lumibox://thumb/${imageId}`;
  }
  // 无 imageId 时退回到 img 协议(如未在 DB 中的临时文件)
  return `lumibox://img/${encodeURIComponent(rel)}`;
}

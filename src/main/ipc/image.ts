import { ipcMain } from 'electron';
import path from 'path';
import { moveImages, copyImages, moveToTrash } from '../services/fs-ops';
import { getOrCreateThumbnail } from '../services/thumbnail';
import { getLibraryRoot, resolveLibraryPath } from '../services/path-guard';
import { listImagesByDir, getImageById, deleteImage, insertTrash, updateImagePath } from '../services/database';
import { readExif } from '../services/exif';
import { probeVideoMetadata, pickRandomTimestamp } from '../services/video-probe';

export function registerImageHandlers(): void {
  ipcMain.handle('image:listByDir', (_evt, dirPath: string, page: number) => {
    return listImagesByDir(dirPath, page, 100);
  });

  ipcMain.handle('image:moveImages', (_evt, srcPaths: string[], destDir: string) => {
    const dest = resolveLibraryPath(destDir);
    // 更新 DB 记录的路径
    const root = getLibraryRoot();
    const result = moveImages(srcPaths, dest);
    return result;
  });

  ipcMain.handle('image:copyImages', (_evt, srcPaths: string[], destDir: string) => {
    const dest = resolveLibraryPath(destDir);
    return copyImages(srcPaths, dest);
  });

  ipcMain.handle('image:deleteMany', (_evt, imageIds: number[]) => {
    const root = getLibraryRoot();
    const trashIds: number[] = [];
    const failed: { path: string; error: string }[] = [];
    let deleted = 0;
    for (const id of imageIds) {
      const img = getImageById(id);
      if (!img) { failed.push({ path: String(id), error: '图片不存在' }); continue; }
      const abs = path.join(root, img.path);
      try {
        const { trashName, size } = moveToTrash(abs);
        const trashId = insertTrash({ imageId: id, originalPath: img.path, trashName, size });
        trashIds.push(trashId);
        deleteImage(id);
        deleted++;
      } catch (e) {
        failed.push({ path: img.path, error: (e as Error).message });
      }
    }
    return { deleted, trashIds, failed };
  });

  ipcMain.handle('image:getThumbnail', async (_evt, imageId: number) => {
    const img = getImageById(imageId);
    if (!img) throw new Error('图片不存在');
    const root = getLibraryRoot();
    const abs = path.join(root, img.path);
    // 传递 imageId,让视频走 lumibox://vframe/<imageId> 协议(内存缓存)
    return getOrCreateThumbnail(abs, {
      videoThumbnailTime: img.videoThumbnailTime ?? 1,
      videoDuration: img.duration,
      imageId
    });
  });

  ipcMain.handle('image:getExif', async (_evt, imageId: number) => {
    const img = getImageById(imageId);
    if (!img) throw new Error('图片不存在');
    const root = getLibraryRoot();
    const abs = path.join(root, img.path);
    const exif = readExif(abs);
    // 视频补充元数据到 exif 返回值
    if (img.type === 'video') {
      // 若数据库已含完整元数据(4 项全有),优先用数据库值
      const hasAllMeta = img.width && img.height && img.duration != null && img.fps != null && img.bitrate != null;
      if (hasAllMeta) {
        return {
          ...exif,
          duration: img.duration,
          fps: img.fps,
          bitrate: img.bitrate,
          width: img.width,
          height: img.height
        };
      }
      // 否则现取一次,并将结果合并写入数据库,避免每次都重新探查
      const probe = await probeVideoMetadata(abs);
      const merged = {
        ...exif,
        width: img.width ?? probe.width,
        height: img.height ?? probe.height,
        duration: img.duration ?? probe.duration,
        fps: img.fps ?? probe.fps,
        bitrate: img.bitrate ?? probe.bitrate
      };
      // 异步更新数据库,不阻塞返回
      try {
        const { updateVideoMeta } = require('../services/database');
        // 若 videoThumbnailTime 缺失,根据 probe 时长计算一个稳定的随机时间戳
        const thumbnailTime = img.videoThumbnailTime != null
          ? img.videoThumbnailTime
          : pickRandomTimestamp(abs, probe.duration);
        updateVideoMeta(imageId, {
          width: probe.width,
          height: probe.height,
          duration: probe.duration,
          fps: probe.fps,
          bitrate: probe.bitrate,
          videoThumbnailTime: thumbnailTime
        });
      } catch { /* 忽略更新失败 */ }
      return merged;
    }
    // 图片:若数据库已存宽高,直接返回;否则用 sharp 实时读取并写回数据库
    if (img.width && img.height) {
      return { ...exif, width: img.width, height: img.height };
    }
    try {
      const sharp = require('sharp');
      const meta = await sharp(abs).metadata();
      if (meta.width && meta.height) {
        try {
          const { updateVideoMeta } = require('../services/database');
          updateVideoMeta(imageId, { width: meta.width, height: meta.height });
        } catch { /* 忽略写回失败 */ }
        return { ...exif, width: meta.width, height: meta.height };
      }
    } catch { /* sharp 读取失败,返回原始 exif */ }
    return exif;
  });

  // destDir 为相对库根的目标目录(当前相册路径),空串表示导入到库根
  ipcMain.handle('image:importExternal', (_evt, filePaths: string[], mode: 'move' | 'copy', destDir: string) => {
    const dest = resolveLibraryPath(destDir);
    if (mode === 'move') return moveImages(filePaths, dest);
    return copyImages(filePaths, dest);
  });

  ipcMain.handle('image:getAbsolutePath', (_evt, imageId: number) => {
    const img = getImageById(imageId);
    if (!img) throw new Error('图片不存在');
    return path.join(getLibraryRoot(), img.path);
  });
}

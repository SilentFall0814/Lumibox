import { ipcMain } from 'electron';
import path from 'path';
import { moveImages, copyImages, moveToTrash } from '../services/fs-ops';
import { getOrCreateThumbnail } from '../services/thumbnail';
import { getLibraryRoot, resolveLibraryPath } from '../services/path-guard';
import { listImagesByDir, getImageById, deleteImage, insertTrash, updateImagePath } from '../services/database';
import { readExif } from '../services/exif';

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
    return getOrCreateThumbnail(path.join(root, img.path));
  });

  ipcMain.handle('image:getExif', (_evt, imageId: number) => {
    const img = getImageById(imageId);
    if (!img) throw new Error('图片不存在');
    const root = getLibraryRoot();
    return readExif(path.join(root, img.path));
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

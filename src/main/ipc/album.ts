import { ipcMain } from 'electron';
import path from 'path';
import { listAlbums, createAlbum, renameAlbum, removeAlbumToTrash, moveImages } from '../services/fs-ops';
import { getLibraryRoot, resolveLibraryPath } from '../services/path-guard';
import { getImageById, deleteImageByPath, updateImagePath } from '../services/database';

export function registerAlbumHandlers(): void {
  ipcMain.handle('album:listAlbums', () => listAlbums());

  ipcMain.handle('album:createAlbum', (_evt, name: string) => createAlbum(name));

  ipcMain.handle('album:renameAlbum', (_evt, oldName: string, newName: string) => {
    renameAlbum(oldName, newName);
  });

  ipcMain.handle('album:removeAlbum', (_evt, albumPath: string) => {
    removeAlbumToTrash(albumPath);
  });

  ipcMain.handle('album:moveImagesTo', (_evt, imageIds: number[], albumPath: string) => {
    const destDir = resolveLibraryPath(albumPath);
    const root = getLibraryRoot();
    const imgs = imageIds.map(getImageById).filter((i): i is NonNullable<typeof i> => i !== null);
    const srcPaths = imgs.map((img) => path.join(root, img.path));
    const result = moveImages(srcPaths, destDir);
    // 更新 DB:删除旧记录,扫描时重新插入新路径
    for (const img of imgs) {
      const newPath = path.relative(root, path.join(destDir, img.name)).replace(/\\/g, '/');
      updateImagePath(img.id, newPath, img.name);
    }
    return result;
  });
}

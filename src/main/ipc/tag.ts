import { ipcMain } from 'electron';
import {
  listTags, createTag, attachTag, detachTag, listTagsByImage
} from '../services/database';
import {
  listVirtualAlbums, createVirtualAlbum, addImageToVirtualAlbum,
  removeImageFromVirtualAlbum, deleteVirtualAlbum
} from '../services/database';

export function registerTagHandlers(): void {
  ipcMain.handle('tag:listTags', () => listTags());
  ipcMain.handle('tag:createTag', (_evt, name: string) => createTag(name.trim()));
  ipcMain.handle('tag:attachTag', (_evt, imageId: number, tagId: number) => attachTag(imageId, tagId));
  ipcMain.handle('tag:detachTag', (_evt, imageId: number, tagId: number) => detachTag(imageId, tagId));
  ipcMain.handle('tag:listTagsByImage', (_evt, imageId: number) => listTagsByImage(imageId));

  // 虚拟相册
  ipcMain.handle('tag:listVirtualAlbums', () => listVirtualAlbums());
  ipcMain.handle('tag:createVirtualAlbum', (_evt, name: string) => createVirtualAlbum(name.trim()));
  ipcMain.handle('tag:addToVirtualAlbum', (_evt, albumId: number, imageId: number) => addImageToVirtualAlbum(albumId, imageId));
  ipcMain.handle('tag:removeFromVirtualAlbum', (_evt, albumId: number, imageId: number) => removeImageFromVirtualAlbum(albumId, imageId));
  ipcMain.handle('tag:deleteVirtualAlbum', (_evt, albumId: number) => deleteVirtualAlbum(albumId));
}

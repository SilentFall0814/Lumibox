import { contextBridge, ipcRenderer } from 'electron';
import type { LumiboxAPI } from '../shared/types';

const api: LumiboxAPI = {
  library: {
    selectDirectory: () => ipcRenderer.invoke('library:selectDirectory'),
    initLibrary: (rootPath) => ipcRenderer.invoke('library:initLibrary', rootPath),
    getConfig: () => ipcRenderer.invoke('library:getConfig'),
    listLibraries: () => ipcRenderer.invoke('library:listLibraries'),
    switchLibrary: (id) => ipcRenderer.invoke('library:switchLibrary', id)
  },
  album: {
    listAlbums: () => ipcRenderer.invoke('album:listAlbums'),
    createAlbum: (name) => ipcRenderer.invoke('album:createAlbum', name),
    renameAlbum: (oldName, newName) => ipcRenderer.invoke('album:renameAlbum', oldName, newName),
    removeAlbum: (albumPath) => ipcRenderer.invoke('album:removeAlbum', albumPath),
    moveImagesTo: (imageIds, albumPath) => ipcRenderer.invoke('album:moveImagesTo', imageIds, albumPath)
  },
  image: {
    listByDir: (dirPath, page) => ipcRenderer.invoke('image:listByDir', dirPath, page),
    moveImages: (srcPaths, destDir) => ipcRenderer.invoke('image:moveImages', srcPaths, destDir),
    copyImages: (srcPaths, destDir) => ipcRenderer.invoke('image:copyImages', srcPaths, destDir),
    deleteMany: (imageIds) => ipcRenderer.invoke('image:deleteMany', imageIds),
    getThumbnail: (imageId) => ipcRenderer.invoke('image:getThumbnail', imageId),
    getExif: (imageId) => ipcRenderer.invoke('image:getExif', imageId),
    importExternal: (filePaths, mode, destDir) => ipcRenderer.invoke('image:importExternal', filePaths, mode, destDir),
    getAbsolutePath: (imageId) => ipcRenderer.invoke('image:getAbsolutePath', imageId)
  },
  trash: {
    listTrash: () => ipcRenderer.invoke('trash:listTrash'),
    restore: (trashId) => ipcRenderer.invoke('trash:restore', trashId),
    purge: (trashId) => ipcRenderer.invoke('trash:purge', trashId),
    emptyTrash: () => ipcRenderer.invoke('trash:emptyTrash')
  },
  tag: {
    listTags: () => ipcRenderer.invoke('tag:listTags'),
    createTag: (name) => ipcRenderer.invoke('tag:createTag', name),
    attachTag: (imageId, tagId) => ipcRenderer.invoke('tag:attachTag', imageId, tagId),
    detachTag: (imageId, tagId) => ipcRenderer.invoke('tag:detachTag', imageId, tagId),
    listTagsByImage: (imageId) => ipcRenderer.invoke('tag:listTagsByImage', imageId)
  },
  search: {
    byName: (query) => ipcRenderer.invoke('search:byName', query),
    byDateRange: (from, to) => ipcRenderer.invoke('search:byDateRange', from, to),
    byTags: (tagIds) => ipcRenderer.invoke('search:byTags', tagIds),
    byExif: (camera, lens) => ipcRenderer.invoke('search:byExif', camera, lens)
  },
  undo: {
    pushUndo: (entry) => ipcRenderer.invoke('undo:pushUndo', entry),
    undo: () => ipcRenderer.invoke('undo:undo'),
    canUndo: () => ipcRenderer.invoke('undo:canUndo')
  },
  viewer: {
    openFullscreen: (imageId) => ipcRenderer.invoke('viewer:openFullscreen', imageId)
  },
  scan: {
    onProgress: (cb) => {
      const handler = (_: unknown, current: number, total: number) => cb(current, total);
      ipcRenderer.on('scan:progress', handler);
    },
    onImageChanged: (cb) => {
      const handler = (_: unknown, payload: { type: 'add' | 'unlink' | 'change'; path: string }) => cb(payload);
      ipcRenderer.on('image:changed', handler);
      // 返回取消订阅函数,便于组件卸载时清理
      return () => ipcRenderer.removeListener('image:changed', handler);
    },
    onAlbumChanged: (cb) => {
      const handler = () => cb();
      ipcRenderer.on('album:changed', handler);
      return () => ipcRenderer.removeListener('album:changed', handler);
    }
  }
};

contextBridge.exposeInMainWorld('lumibox', api);

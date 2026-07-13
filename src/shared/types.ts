// 主进程与渲染层共享的类型定义

export interface Library {
  id: number;
  name: string;
  rootPath: string;
  createdAt: number;
}

export interface Config {
  currentLibraryId: number | null;
}

export interface InitResult {
  ok: boolean;
  error?: string;
  library?: Library;
}

export interface Album {
  name: string;
  path: string;        // 相对库根的相对路径
  absolutePath: string;
  imageCount: number;
}

export type MediaType = 'image' | 'video';

export interface ImageRecord {
  id: number;
  path: string;
  name: string;
  type: MediaType;
  createdAt: number;
  exifCamera?: string;
  exifLens?: string;
  exifDate?: number;
  width?: number;
  height?: number;
  size: number;
  duration?: number; // 视频时长(秒),仅视频
}

export interface ImagePage {
  items: ImageRecord[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface MoveResult {
  moved: number;
  failed: { path: string; error: string }[];
}

export interface DeleteResult {
  deleted: number;
  trashIds: number[];
  failed: { path: string; error: string }[];
}

export interface TrashItem {
  id: number;
  originalPath: string;
  trashName: string;
  trashedAt: number;
  size: number;
  imageId: number | null;
  restored: number;
}

export interface Tag {
  id: number;
  name: string;
  count?: number;
}

export interface VirtualAlbum {
  id: number;
  name: string;
  imageCount: number;
}

export interface ExifData {
  camera?: string;
  lens?: string;
  date?: number;
  width?: number;
  height?: number;
}

export interface UndoEntry {
  type: 'delete' | 'move';
  data: DeleteUndoData | MoveUndoData;
}

export interface DeleteUndoData {
  trashIds: number[];
}

export interface MoveUndoData {
  moves: { from: string; to: string }[];
}

export interface UndoResult {
  ok: boolean;
  undone?: UndoEntry;
  error?: string;
}

// IPC 渲染层 API 接口
export interface LumiboxAPI {
  library: {
    selectDirectory(): Promise<string | null>;
    initLibrary(rootPath: string): Promise<InitResult>;
    getConfig(): Promise<Config | null>;
    listLibraries(): Promise<Library[]>;
    switchLibrary(id: number): Promise<void>;
  };
  album: {
    listAlbums(): Promise<Album[]>;
    createAlbum(name: string): Promise<Album>;
    renameAlbum(oldName: string, newName: string): Promise<void>;
    removeAlbum(albumPath: string): Promise<void>;
    moveImagesTo(imageIds: number[], albumPath: string): Promise<MoveResult>;
  };
  image: {
    listByDir(dirPath: string, page: number): Promise<ImagePage>;
    moveImages(srcPaths: string[], destDir: string): Promise<MoveResult>;
    copyImages(srcPaths: string[], destDir: string): Promise<MoveResult>;
    deleteMany(imageIds: number[]): Promise<DeleteResult>;
    getThumbnail(imageId: number): Promise<string>;
    getExif(imageId: number): Promise<ExifData>;
    importExternal(filePaths: string[], mode: 'move' | 'copy', destDir: string): Promise<MoveResult>;
    getAbsolutePath(imageId: number): Promise<string>;
  };
  trash: {
    listTrash(): Promise<TrashItem[]>;
    restore(trashId: number): Promise<void>;
    purge(trashId: number): Promise<void>;
    emptyTrash(): Promise<void>;
  };
  tag: {
    listTags(): Promise<Tag[]>;
    createTag(name: string): Promise<Tag>;
    attachTag(imageId: number, tagId: number): Promise<void>;
    detachTag(imageId: number, tagId: number): Promise<void>;
    listTagsByImage(imageId: number): Promise<Tag[]>;
  };
  search: {
    byName(query: string): Promise<ImageRecord[]>;
    byDateRange(from: number, to: number): Promise<ImageRecord[]>;
    byTags(tagIds: number[]): Promise<ImageRecord[]>;
    byExif(camera?: string, lens?: string): Promise<ImageRecord[]>;
  };
  undo: {
    pushUndo(entry: UndoEntry): Promise<void>;
    undo(): Promise<UndoResult>;
    canUndo(): Promise<boolean>;
  };
  viewer: {
    openFullscreen(imageId: number): Promise<void>;
  };
  scan: {
    onProgress(cb: (current: number, total: number) => void): void;
    onImageChanged(cb: (payload: { type: 'add' | 'unlink' | 'change'; path: string }) => void): () => void;
    onAlbumChanged(cb: () => void): () => void;
  };
}

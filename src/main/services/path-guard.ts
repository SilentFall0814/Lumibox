import path from 'path';

// 当前活动库根目录(绝对路径)
let libraryRoot: string | null = null;

export function setLibraryRoot(root: string | null): void {
  libraryRoot = root ? path.resolve(root) : null;
}

export function getLibraryRoot(): string {
  if (!libraryRoot) throw new Error('尚未初始化照片库');
  return libraryRoot;
}

export function hasLibraryRoot(): boolean {
  return libraryRoot !== null;
}

/** 判断路径是否在 .lumibox 系统目录内 */
export function isInsideLumibox(targetPath: string): boolean {
  if (!libraryRoot) return false;
  const resolved = path.resolve(targetPath);
  const lumiboxDir = path.join(libraryRoot, '.lumibox') + path.sep;
  return resolved.startsWith(lumiboxDir);
}

/** 断言路径在库根内,禁止越界 */
export function assertWithinLibrary(targetPath: string): void {
  if (!libraryRoot) throw new Error('尚未初始化照片库');
  const resolved = path.resolve(targetPath);
  // 必须是库根或其子路径
  if (resolved !== libraryRoot && !resolved.startsWith(libraryRoot + path.sep)) {
    throw new Error('路径越界,禁止操作');
  }
}

/** 将相对路径解析为库内绝对路径,并校验 */
export function resolveLibraryPath(relativePath: string): string {
  if (!libraryRoot) throw new Error('尚未初始化照片库');
  const resolved = path.resolve(libraryRoot, relativePath);
  assertWithinLibrary(resolved);
  return resolved;
}

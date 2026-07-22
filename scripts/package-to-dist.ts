// 自定义打包脚本:绕过被锁的 out/ 目录,直接打包到指定输出目录
// 使用 Forge 的 Node API,可以指定 outDir
// 输出目录可通过环境变量 PKG_OUT_DIR 覆盖,默认 dist-package
// 若旧目录被锁(如火绒扫描占用),可设置 PKG_OUT_DIR=dist-pkg-new 绕过
import path from 'path';
import fs from 'fs';
import { api } from '@electron-forge/core';

async function main(): Promise<void> {
  const projectDir = process.cwd();
  const outDirName = process.env.PKG_OUT_DIR || 'dist-package';
  const outDir = path.resolve(projectDir, outDirName);
  console.log('[package] 项目目录:', projectDir);
  console.log('[package] 输出目录:', outDir);

  // 清理旧输出(若存在且未被锁)
  if (fs.existsSync(outDir)) {
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
      console.log('[package] 已清理旧输出目录');
    } catch (err) {
      console.warn('[package] 清理旧目录失败(可能被锁),继续打包将覆盖:', (err as Error).message);
    }
  }

  await api.package({
    dir: projectDir,
    interactive: true,
    outDir
  });
  console.log('[package] 打包完成');
}

main().catch((err) => {
  console.error('[package] 打包失败:', err);
  process.exit(1);
});

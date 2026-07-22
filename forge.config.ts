import type { ForgeConfig } from '@electron-forge/shared-types';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// ============ Native 模块强制复制钩子 ============
// 背景:webpack 插件的 packageAfterCopy 钩子会在 buildPath 下创建空的 node_modules 目录,
// 导致 packager copy 阶段复制的 native 模块丢失(实测 app.asar 内 node_modules 为空)。
// 方案:在 afterPrune 钩子中(即 prune 完成、asar 打包之前)强制把 native 模块从项目
// node_modules 复制到 buildPath/node_modules/,确保 asar 打包时能正确包含并 unpack 这些二进制。

const fsCopyFile = promisify(fs.copyFile);
const fsMkdir = promisify(fs.mkdir);
const fsReaddir = promisify(fs.readdir);
const fsStat = promisify(fs.stat);
const fsReadFile = promisify(fs.readFile);

// 需要强制复制的 native 模块(对应 webpack.main.config.ts 中 externals 声明的运行时依赖)
// 这些模块不会被 webpack 打包,必须保留在 node_modules 中以供 require() 加载
const REQUIRED_NATIVE_MODULES = [
  'ffmpeg-static',        // ffmpeg.exe - 视频抓帧
  'ffprobe-static',       // ffprobe.exe - 视频元数据探查
  'sharp',                // libvips 入口 - 图片缩略图
  'better-sqlite3',       // .node - 数据库
  'fluent-ffmpeg',        // ffmpeg Node.js 封装(纯 JS,但运行时依赖 ffmpeg-static)
];

/** 递归复制目录(含所有子目录和文件) */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await fsMkdir(dest, { recursive: true });
  const entries = await fsReaddir(src);
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stats = await fsStat(srcPath);
    if (stats.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fsCopyFile(srcPath, destPath);
    }
  }
}

/**
 * 递归复制模块及其所有传递依赖
 * - 读取模块的 package.json 获取 dependencies 和 optionalDependencies
 * - 递归复制所有依赖模块(避免循环依赖)
 * - 这样能确保 sharp/better-sqlite3 等 native 模块的 JS 依赖(如 semver、bindings)也被复制
 */
async function copyModuleTree(
  moduleName: string,
  srcRoot: string,
  destRoot: string,
  visited: Set<string>
): Promise<void> {
  // 避免循环依赖导致无限递归
  if (visited.has(moduleName)) return;
  visited.add(moduleName);

  const srcModulePath = path.join(srcRoot, moduleName);
  const destModulePath = path.join(destRoot, moduleName);

  // 源模块不存在则跳过(例如 @img/sharp-linux-x64 在 Windows 上不存在)
  if (!fs.existsSync(srcModulePath)) {
    return;
  }

  // 读取 package.json 获取依赖列表(含 optionalDependencies,sharp 的 @img/* 在这里)
  const pkgJsonPath = path.join(srcModulePath, 'package.json');
  let deps: string[] = [];
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(await fsReadFile(pkgJsonPath, 'utf-8'));
      deps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.optionalDependencies || {}),
      ];
    } catch {
      // package.json 解析失败,忽略(仍复制目录本身)
    }
  }

  // 复制模块目录(含所有文件,包括 native 二进制 .exe/.node/.dll)
  await copyDirRecursive(srcModulePath, destModulePath);

  // 递归复制所有依赖
  for (const dep of deps) {
    await copyModuleTree(dep, srcRoot, destRoot, visited);
  }
}

/**
 * afterPrune 钩子:在 prune 完成、asar 打包前强制复制 native 模块
 * - 解决 webpack 插件的 packageAfterCopy 创建空 node_modules 导致 native 模块丢失的问题
 * - 复制后 asar 会根据 unpackDir/unpack 配置把 native 二进制解包到 app.asar.unpacked
 */
function forceCopyNativeModules(
  buildPath: string,
  _electronVersion: string,
  platform: string,
  _arch: string,
  callback: (err?: Error) => void
): void {
  // 仅 Windows 平台需要(当前应用仅打包 win32-x64)
  if (platform !== 'win32') {
    callback();
    return;
  }

  const srcNodeModules = path.join(__dirname, 'node_modules');
  const destNodeModules = path.join(buildPath, 'node_modules');

  console.log('[afterPrune] 强制复制 native 模块...');
  console.log(`[afterPrune] 源目录: ${srcNodeModules}`);
  console.log(`[afterPrune] 目标目录: ${destNodeModules}`);

  fsMkdir(destNodeModules, { recursive: true })
    .then(() => {
      const visited = new Set<string>();
      // 串行复制每个 native 模块(避免并发 IO 冲突)
      return REQUIRED_NATIVE_MODULES.reduce(
        (chain, mod) => chain.then(() => copyModuleTree(mod, srcNodeModules, destNodeModules, visited)),
        Promise.resolve()
      ).then(() => {
        console.log(`[afterPrune] 复制完成,共处理 ${visited.size} 个模块`);
      });
    })
    .then(() => callback())
    .catch((err: Error) => callback(err));
}

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Lumibox',
    executableName: 'Lumibox',
    icon: './build/icon.ico',
    // asar 配置:native modules 必须解包到 app.asar.unpacked 才能被 require
    // - unpackDir 用 glob 匹配目录(必须用正斜杠,path.join 在 Windows 会用反斜杠导致匹配失败)
    // - better-sqlite3/ffmpeg-static/ffprobe-static/sharp 的 native 二进制必须解包
    // - 额外用 unpack 匹配根目录下的 .exe/.node 文件(ffmpeg.exe 位于 ffmpeg-static/ 根目录,
    //   unpackDir 的 ** 模式对根级文件匹配不稳定,这里显式指定)
    asar: {
      unpackDir: '**/{better-sqlite3,ffmpeg-static,ffprobe-static,sharp,@img}/**',
      unpack: '**/{ffmpeg-static,ffprobe-static,@img/sharp-win32-x64}/*.{exe,node,dll}'
    },
    extraResource: ['./build/icon.ico', './build/icon.png'],
    // 应用元信息(显示在 Windows 系统属性中)
    appBundleId: 'com.lumibox.app',
    appCategoryType: 'public.app-category.photography',
    // 版权信息
    copyright: '© 2026 拾光盒 Lumibox · MIT 开源 · Made with care by SilentFall',
    // 版本描述
    appVersion: '1.0.1',
    buildVersion: '1.0.1',
    // 打包前运行 npm prune --production,移除 devDependencies,仅保留运行时依赖
    // 必须配合下方的 ignore 一起使用,确保 externals 声明的原生模块被保留
    prune: true,
    // 覆盖 webpack 插件默认的 ignore(默认仅保留 .webpack/ 目录,会丢失原生模块)
    // 这里同时保留 .webpack/ 与 node_modules/ 中的运行时依赖,并排除无用文件以减小体积
    ignore: (filePath: string) => {
      if (!filePath) return false;
      // 保留 .webpack/ 目录(webpack 打包输出)
      if (/^[/\\]\.webpack([/\\]|$)/.test(filePath)) return false;
      // 保留根目录 package.json(electron 启动需要)
      if (/^[/\\]package\.json$/.test(filePath)) return false;
      // 保留整个 node_modules/(prune:true 会移除其中的 devDependencies)
      // 保留目录本身以便递归检查子项
      if (/^[/\\]node_modules$/.test(filePath)) return false;
      if (/^[/\\]node_modules[/\\]/.test(filePath)) {
        // ============ 排除 node_modules 内的无用文件以减小 asar 体积 ============
        // 1. 测试/文档/示例目录
        if (/[/\\](test|tests|__tests__|docs?|examples?|coverage|\.nyc_output|bench|benchmarks?)([/\\]|$)/.test(filePath)) return true;
        // 2. 构建工具目录(fluent-ffmpeg 的 tools/、doc/ 等)
        if (/[/\\]node_modules[/\\]fluent-ffmpeg[/\\](tools|doc|coverage|OLD)([/\\]|$)/.test(filePath)) return true;
        // 3. 类型定义文件(运行时不需要;@types/* 整个包也排除)
        if (/[/\\]node_modules[/\\]@types[/\\]/.test(filePath)) return true;
        if (/\.(d\.ts|flow|coffee\.md|markdown)$/.test(filePath)) return true;
        // 4. 源映射文件
        if (/\.map$/.test(filePath)) return true;
        // 5. 构建脚本与配置文件(运行时不需要)
        if (/(\/|\\)(tsconfig|jsconfig|babelrc|eslintrc|prettierrc|\.editorconfig|jest\.config|vite\.config|webpack\.config)(\.[a-z]+)?$/.test(filePath)) return true;
        // 6. README/CHANGELOG 等文档(保留 LICENSE 以遵守开源协议)
        if (/(README|CHANGELOG|HISTORY|AUTHORS|CONTRIBUTORS)(\.[a-z]+)?$/i.test(filePath)) return true;
        // 7. .bin 目录(npm 链接脚本,运行时不需要)
        if (/[/\\]node_modules[/\\]\.bin[/\\]/.test(filePath)) return true;
        // 8. ffprobe-static 的非 win32-x64 二进制(仅保留 win32\x64,排除 darwin/linux/ia32)
        // 节省约 275MB 体积
        if (/[/\\]node_modules[/\\]ffprobe-static[/\\]bin[/\\](darwin|linux)([/\\]|$)/.test(filePath)) return true;
        if (/[/\\]node_modules[/\\]ffprobe-static[/\\]bin[/\\]win32[/\\]ia32([/\\]|$)/.test(filePath)) return true;
        // 9. 保留其余文件
        return false;
      }
      // 忽略其他所有文件(src/、tests/、build/ 等,这些不进入安装包)
      return true;
    },
    // afterPrune 钩子:在 prune 完成、asar 打包前强制复制 native 模块到 buildPath/node_modules/
    // 解决 webpack 插件的 packageAfterCopy 创建空 node_modules 导致 native 模块丢失的问题
    // 详见上方 forceCopyNativeModules 函数的注释
    afterPrune: [forceCopyNativeModules]
  },
  makers: [
    // Squirrel.Windows 安装程序:生成 Setup.exe 安装包 + NuGet 自动更新包
    new MakerSquirrel({
      // 安装程序标题(显示在标题栏与控制面板)
      title: '拾光盒 Lumibox',
      // 应用名称(开始菜单/快捷方式名称)
      name: 'Lumibox',
      // 制造商(显示在控制面板的"发布者"字段)
      authors: 'SilentFall',
      // 软件描述(显示在卸载界面)
      description: '拾光盒 Lumibox - 本地优先的照片与视频管理,把回忆留在身边。',
      // 安装程序图标(必须是 .ico 格式)
      setupIcon: './build/icon.ico',
      // 不生成 MSI(用户机器无需 .NET,直接用 Squirrel Setup.exe)
      noMsi: true
    }),
    // ZIP 便携版:免安装,解压即用
    new MakerZIP({})
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [{
          html: './src/renderer/index.html',
          js: './src/renderer/src/main.tsx',
          name: 'main_window',
          preload: {
            js: './src/preload/index.ts',
            name: 'preload'
          }
        }]
      }
    })
  ]
};

export default config;

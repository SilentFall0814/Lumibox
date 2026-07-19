import path from 'path';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Lumibox',
    executableName: 'Lumibox',
    icon: './build/icon.ico',
    // asar 配置:native modules 必须解包到 app.asar.unpacked 才能被 require
    // - unpackDir 用 glob 匹配目录(string,不是数组)
    // - better-sqlite3/ffmpeg-static/ffprobe-static/sharp 的 native 二进制必须解包
    asar: {
      unpackDir: path.join('**', '{better-sqlite3,ffmpeg-static,ffprobe-static,sharp,@img}', '**')
    },
    extraResource: ['./build/icon.ico', './build/icon.png'],
    // 应用元信息(显示在 Windows 系统属性中)
    appBundleId: 'com.lumibox.app',
    appCategoryType: 'public.app-category.photography',
    // 版权信息
    copyright: '© 2026 拾光盒 Lumibox · MIT 开源 · Made with care by SilentFall',
    // 版本描述
    appVersion: '1.0.0',
    buildVersion: '1.0.0'
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

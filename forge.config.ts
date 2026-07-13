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
    icon: './build/icon.png',
    asar: { unpack: ['**/better-sqlite3/**', '**/ffmpeg-static/**', '**/sharp/**'] },
    extraResource: ['./build/icon.png']
  },
  makers: [
    new MakerSquirrel(),
    new MakerZIP({}, ['win32-x64'])
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

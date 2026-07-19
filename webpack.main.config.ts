import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  entry: './src/main/index.ts',
  module: { rules },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    mainFields: ['main', 'module']
  },
  // 原生模块标记为 external,避免被打包
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'sharp': 'commonjs sharp',
    'chokidar': 'commonjs chokidar',
    'exif-reader': 'commonjs exif-reader',
    'ffmpeg-static': 'commonjs ffmpeg-static',
    'ffprobe-static': 'commonjs ffprobe-static',
    'fluent-ffmpeg': 'commonjs fluent-ffmpeg'
  }
};

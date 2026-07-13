import type { Configuration } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { rules } from './webpack.rules';

export const rendererConfig: Configuration = {
  entry: './src/renderer/src/main.tsx',
  // 用非 eval 的 source map,避免 CSP 阻止 unsafe-eval
  devtool: 'source-map',
  module: { rules },
  resolve: {
    extensions: ['.js', '.ts', '.tsx'],
    alias: { '@': path.resolve(__dirname, 'src/renderer/src') }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html'
    })
  ]
};

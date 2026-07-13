import type { ModuleRule } from 'webpack';

export const rules: ModuleRule[] = [
  {
    test: /\.tsx?$/,
    exclude: /node_modules/,
    use: { loader: 'ts-loader', options: { transpileOnly: true } }
  },
  {
    test: /\.css$/,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'postcss-loader' }
    ]
  },
  {
    test: /\.(png|jpe?g|gif|webp|svg|ico)$/,
    type: 'asset/resource'
  },
  // 字体文件:PingFangSC 等
  {
    test: /\.(ttf|woff2?|eot)$/,
    type: 'asset/resource'
  }
];

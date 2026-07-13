// 生成圆角矩形切边的 logo
// 将原始方形 logo 裁切为圆角矩形,四角透明
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZE = 512; // 输出尺寸
const RADIUS = 100; // 圆角半径(占边长的 ~20%)
const INPUT = path.join(__dirname, '..', 'APP_Logo.png');
const OUTPUT = path.join(__dirname, '..', 'build', 'icon.png');

async function main() {
  // 确保 build 目录存在
  const buildDir = path.dirname(OUTPUT);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // 1. 先把原图缩放到目标尺寸
  const resized = await sharp(INPUT)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .toBuffer();

  // 2. 生成圆角矩形 mask(SVG)
  const svg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="white"/>
    </svg>
  `);

  // 3. 用 mask 裁切图片:把缩略图叠在 mask 上,输出带 alpha 的 PNG
  await sharp(resized)
    .composite([{
      input: svg,
      blend: 'dest-in'
    }])
    .png()
    .toFile(OUTPUT);

  // 4. 同时覆盖原始 APP_Logo.png 旁边的圆角版本(开发态用)
  const devOutput = path.join(__dirname, '..', 'build', 'APP_Logo_rounded.png');
  await fs.promises.copyFile(OUTPUT, devOutput);

  console.log(`圆角 logo 已生成: ${OUTPUT}`);
  console.log(`开发态副本: ${devOutput}`);
}

main().catch(err => {
  console.error('生成失败:', err);
  process.exit(1);
});

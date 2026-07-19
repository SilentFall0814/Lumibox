/**
 * 将 PNG 图标转换为 Windows ICO 格式
 * - ICO 文件结构:6 字节头部 + N 个 16 字节目录项 + N 个图像数据
 * - 现代 ICO 支持 PNG 嵌入(Windows Vista+),无需转 BMP/DIB
 * - 生成多尺寸(16/32/48/64/128/256)以适配不同显示场景
 *
 * 用法:node scripts/png-to-ico.js <input.png> <output.ico>
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const input = process.argv[2] || 'src/renderer/src/assets/logo.png';
  const output = process.argv[3] || 'build/icon.ico';

  if (!fs.existsSync(input)) {
    console.error(`输入文件不存在: ${input}`);
    process.exit(1);
  }

  // 生成多尺寸 PNG buffers(ICO 标准尺寸 + 大尺寸用于高 DPI)
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(input)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  // ICO 文件头(6 字节)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // 保留字段,必须为 0
  header.writeUInt16LE(1, 2);   // 类型:1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4);  // 图像数量

  // 目录项(每项 16 字节)
  const directory = Buffer.alloc(pngBuffers.length * 16);
  let dataOffset = 6 + directory.length;
  pngBuffers.forEach((item, i) => {
    const offset = i * 16;
    const size = item.size;
    // 尺寸字段:0 表示 256(ICO 规范)
    directory.writeUInt8(size >= 256 ? 0 : size, offset + 0);
    directory.writeUInt8(size >= 256 ? 0 : size, offset + 1);
    directory.writeUInt8(0, offset + 2);  // 调色板数量(0 = 无调色板)
    directory.writeUInt8(0, offset + 3);  // 保留字段
    directory.writeUInt16LE(1, offset + 4);  // 色彩平面数
    directory.writeUInt16LE(32, offset + 6); // 每像素位数
    directory.writeUInt32LE(item.buf.length, offset + 8);  // 图像数据大小
    directory.writeUInt32LE(dataOffset, offset + 12);      // 图像数据偏移
    dataOffset += item.buf.length;
  });

  // 拼装最终 ICO:头部 + 目录 + 所有 PNG 数据
  const ico = Buffer.concat([header, directory, ...pngBuffers.map((p) => p.buf)]);

  // 确保输出目录存在
  const outputDir = path.dirname(output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(output, ico);
  console.log(`✓ 已生成 ICO: ${output} (${ico.length} 字节, ${pngBuffers.length} 个尺寸)`);
}

main().catch((err) => {
  console.error('生成 ICO 失败:', err);
  process.exit(1);
});

// tests/main/helpers/native-mocks.ts
import { vi } from 'vitest';

/**
 * 创建 fluent-ffmpeg 的 mock
 * 模拟 cmd(absPath).seekInput().frames().format().outputOptions().on().pipe() 链式调用
 * 异步触发 'end' 事件并先推送 pngBuffer 数据
 */
export function createFfmpegLibMock(opts: {
  pngBuffer?: Buffer;
  error?: Error;
}) {
  const callbacks: Record<string, Function> = {};
  const stream = {
    on: vi.fn((event: string, cb: Function) => {
      // 'data' 事件:同步推送 buffer 给回调,模拟 ffmpeg 输出 PNG 数据
      // 注意:空 Buffer 不推送(模拟 ffmpeg 无输出场景,使 chunks 保持为空)
      if (event === 'data' && opts.pngBuffer && opts.pngBuffer.length > 0) {
        cb(opts.pngBuffer);
      }
      return stream;
    })
  };
  const cmd = {
    seekInput: vi.fn(() => cmd),
    frames: vi.fn(() => cmd),
    format: vi.fn(() => cmd),
    outputOptions: vi.fn(() => cmd),
    on: vi.fn((event: string, cb: Function) => {
      callbacks[event] = cb;
      return cmd;
    }),
    pipe: vi.fn(() => stream)
  };
  // ffmpeg库本身是可调用对象,同时挂载 setFfmpegPath 静态方法
  const ffmpegLib = vi.fn(() => cmd) as any;
  ffmpegLib.setFfmpegPath = vi.fn();

  // 异步触发 end 或 error(模拟 ffmpeg 处理完成)
  setTimeout(() => {
    if (opts.error && callbacks.error) {
      callbacks.error(opts.error);
    } else if (callbacks.end) {
      callbacks.end();
    }
  }, 0);

  return { ffmpegLib, cmd, stream, callbacks };
}

/**
 * 创建 sharp 的 mock
 * 模拟 sharp(input).resize().jpeg().toBuffer() 和 sharp(input).metadata() 链式调用
 */
export function createSharpMock(opts: {
  jpgBuffer?: Buffer;
  metadata?: { width: number; height: number };
  throw?: Error;
}) {
  const toBuffer = vi.fn(() =>
    opts.throw
      ? Promise.reject(opts.throw)
      : Promise.resolve(opts.jpgBuffer ?? Buffer.from('mock-jpg'))
  );
  const chain = {
    resize: vi.fn(() => chain),
    jpeg: vi.fn(() => chain),
    metadata: vi.fn(() =>
      Promise.resolve(opts.metadata ?? { width: 1920, height: 1080 })
    ),
    toBuffer
  };
  const sharp = vi.fn(() => chain);
  return { sharp, chain };
}

/** ffmpeg-static mock:返回路径字符串 */
export const FFMPEG_PATH_MOCK = '/fake/ffmpeg.exe';

/** ffprobe-static mock */
export function createFfprobeStaticMock(path: string) {
  return { path, version: 'mock-1.0' };
}

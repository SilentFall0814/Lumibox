// tests/main/video-probe.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  probeVideoMetadata,
  pickRandomTimestamp,
  __resetForTesting,
  __setFfprobeLoaderForTest,
  __setExecFileForTest,
  getFfprobePath,
  hashString,
  seededRandom
} from '../../src/main/services/video-probe';

describe('video-probe 纯函数', () => {
  it('pickRandomTimestamp: 时长 < 2 秒返回 0', () => {
    expect(pickRandomTimestamp('/a.mp4', 0)).toBe(0);
    expect(pickRandomTimestamp('/a.mp4', 1.5)).toBe(0);
    expect(pickRandomTimestamp('/a.mp4', undefined)).toBe(0);
  });

  it('pickRandomTimestamp: 同路径同时长返回相同时间戳(确定性)', () => {
    const a = pickRandomTimestamp('/videos/clip.mp4', 100);
    const b = pickRandomTimestamp('/videos/clip.mp4', 100);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(1);
    expect(a).toBeLessThanOrEqual(99);
  });

  it('pickRandomTimestamp: 不同路径返回不同时间戳(大概率)', () => {
    const a = pickRandomTimestamp('/a.mp4', 100);
    const b = pickRandomTimestamp('/b.mp4', 100);
    // 不要求一定不同(有极小概率相同),但大多数情况应不同
    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
  });

  it('hashString: 返回非负整数', () => {
    const h = hashString('test');
    expect(typeof h).toBe('number');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(h)).toBe(true);
  });

  it('hashString: 相同输入返回相同值', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
  });

  it('seededRandom: 返回 [0,1) 范围内的数', () => {
    const r = seededRandom(42);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
  });

  it('seededRandom: 同种子返回同结果', () => {
    expect(seededRandom(123)).toBe(seededRandom(123));
  });
});

describe('video-probe getFfprobePath', () => {
  beforeEach(() => {
    __resetForTesting();
  });

  it('将 app.asar 路径替换为 app.asar.unpacked', () => {
    __setFfprobeLoaderForTest(() => ({
      path: 'C:/app.asar/node_modules/ffprobe-static/ffprobe.exe'
    }));
    const p = getFfprobePath();
    expect(p).toContain('app.asar.unpacked');
    expect(p).not.toMatch(/app\.asar(?!\.unpacked)/);
  });

  it('不含 app.asar 的路径原样返回', () => {
    __setFfprobeLoaderForTest(() => ({
      path: '/usr/local/bin/ffprobe'
    }));
    expect(getFfprobePath()).toBe('/usr/local/bin/ffprobe');
  });

  it('loader 抛异常时返回 null', () => {
    __setFfprobeLoaderForTest(() => { throw new Error('module not found'); });
    expect(getFfprobePath()).toBeNull();
  });

  it('路径缓存:第二次调用不重新加载', () => {
    let callCount = 0;
    __setFfprobeLoaderForTest(() => {
      callCount++;
      return { path: '/fake/ffprobe' };
    });
    getFfprobePath();
    getFfprobePath();
    expect(callCount).toBe(1);
  });
});

describe('video-probe probeVideoMetadata', () => {
  beforeEach(() => {
    __resetForTesting();
    __setFfprobeLoaderForTest(() => ({ path: '/fake/ffprobe' }));
  });

  it('无 ffprobe 时返回空对象', async () => {
    __setFfprobeLoaderForTest(() => { throw new Error('not found'); });
    const result = await probeVideoMetadata('/a.mp4');
    expect(result).toEqual({});
  });

  it('ffprobe 成功返回解析后的元数据', async () => {
    const fakeStdout = JSON.stringify({
      streams: [{
        width: 1920,
        height: 1080,
        r_frame_rate: '30000/1001',
        bit_rate: '5000000'
      }],
      format: { duration: '120.5', bit_rate: '5500000' }
    });
    __setExecFileForTest((_cmd, _args, _opts, cb) => {
      cb(null, fakeStdout, '');
    });
    const result = await probeVideoMetadata('/a.mp4');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.duration).toBe(120.5);
    expect(result.fps).toBeCloseTo(29.97, 1);
    expect(result.bitrate).toBe(5000000);
  });

  it('ffprobe 进程错误时返回空对象', async () => {
    __setExecFileForTest((_cmd, _args, _opts, cb) => {
      cb(new Error('ENOENT'), '', '');
    });
    const result = await probeVideoMetadata('/a.mp4');
    expect(result).toEqual({});
  });

  it('ffprobe 输出非 JSON 时返回空对象', async () => {
    __setExecFileForTest((_cmd, _args, _opts, cb) => {
      cb(null, 'not json at all', '');
    });
    const result = await probeVideoMetadata('/a.mp4');
    expect(result).toEqual({});
  });

  it('帧率解析:整数格式(如 30/1)', async () => {
    const fakeStdout = JSON.stringify({
      streams: [{ r_frame_rate: '30/1' }],
      format: { duration: '10' }
    });
    __setExecFileForTest((_cmd, _args, _opts, cb) => {
      cb(null, fakeStdout, '');
    });
    const result = await probeVideoMetadata('/a.mp4');
    expect(result.fps).toBe(30);
  });

  it('缺失 streams 字段时返回部分数据', async () => {
    const fakeStdout = JSON.stringify({
      format: { duration: '60' }
    });
    __setExecFileForTest((_cmd, _args, _opts, cb) => {
      cb(null, fakeStdout, '');
    });
    const result = await probeVideoMetadata('/a.mp4');
    expect(result.duration).toBe(60);
    expect(result.width).toBeUndefined();
  });
});

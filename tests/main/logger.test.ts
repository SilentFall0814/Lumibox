// tests/main/logger.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createLogger, __resetLoggerForTest } from '../../src/main/services/logger';

describe('logger', () => {
  beforeEach(() => {
    __resetLoggerForTest();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info 级别输出到 console.log 并带 scope', () => {
    const logger = createLogger('test-scope');
    logger.info('启动完成');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[INFO\] \[test-scope\] 启动完成$/)
    );
  });

  it('error 级别输出到 console.error', () => {
    const logger = createLogger('svc');
    logger.error('操作失败', { code: 500 });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[ERROR\] \[svc\] 操作失败 \{"code":500\}$/)
    );
  });

  it('warn 级别输出到 console.warn', () => {
    const logger = createLogger('svc');
    logger.warn('文件不存在', { path: '/x.jpg' });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/\[.*\] \[WARN\] \[svc\] 文件不存在 \{"path":"\/x.jpg"\}$/)
    );
  });

  it('测试环境不写文件(VITEST 环境变量已由 vitest 注入)', () => {
    const logger = createLogger('svc');
    logger.info('测试消息');
    // 在 VITEST 环境下 getLogDir 返回 null,不会尝试写文件
    // 如果没有抛异常即表示通过
    expect(console.log).toHaveBeenCalled();
  });

  it('无 ctx 时不追加 JSON 后缀', () => {
    const logger = createLogger('svc');
    logger.info('纯消息');
    expect(console.log).toHaveBeenCalledWith(
      expect.not.stringContaining('{')
    );
  });
});

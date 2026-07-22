// src/main/services/logger.ts
import path from 'path';
import fs from 'fs';

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB 触发轮转

// 用 undefined 哨兵区分「未计算」与「已计算为 null」
let logDir: string | null | undefined = undefined;
let logFilePath: string | null | undefined = undefined;

function getLogDir(): string | null {
  if (logDir !== undefined) return logDir;
  // 测试环境(VITEST 由 vitest 自动注入)不写文件,避免污染
  if (process.env.VITEST) { logDir = null; return null; }
  try {
    const { app } = require('electron');
    logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    return logDir;
  } catch {
    logDir = null;
    return null;
  }
}

function getLogFilePath(): string | null {
  if (logFilePath !== undefined) return logFilePath;
  const dir = getLogDir();
  if (!dir) { logFilePath = null; return null; }
  logFilePath = path.join(dir, 'main.log');
  return logFilePath;
}

function rolloverIfNeeded(): void {
  const fp = getLogFilePath();
  if (!fp) return;
  try {
    const stat = fs.statSync(fp);
    if (stat.size > MAX_LOG_SIZE) {
      const backup = fp.replace(/\.log$/, '.1.log');
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(fp, backup);
    }
  } catch {
    // 文件不存在或其他错误,忽略
  }
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatLine(level: LogLevel, scope: string, message: string, ctx?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const ctxStr = ctx && Object.keys(ctx).length > 0
    ? ' ' + JSON.stringify(ctx)
    : '';
  return `[${ts}] [${level.toUpperCase()}] [${scope}] ${message}${ctxStr}`;
}

function writeLog(level: LogLevel, scope: string, message: string, ctx?: Record<string, unknown>): void {
  const line = formatLine(level, scope, message, ctx);
  const consoleFn = level === 'error' ? console.error
    : level === 'warn' ? console.warn
    : level === 'debug' ? console.debug
    : console.log;
  consoleFn(line);
  const fp = getLogFilePath();
  if (fp) {
    try {
      rolloverIfNeeded();
      fs.appendFileSync(fp, line + '\n', 'utf-8');
    } catch {
      // 写入失败不能导致应用崩溃
    }
  }
}

export interface Logger {
  info(message: string, ctx?: Record<string, unknown>): void;
  warn(message: string, ctx?: Record<string, unknown>): void;
  error(message: string, ctx?: Record<string, unknown>): void;
  debug(message: string, ctx?: Record<string, unknown>): void;
}

export function createLogger(scope: string): Logger {
  return {
    info: (msg, ctx) => writeLog('info', scope, msg, ctx),
    warn: (msg, ctx) => writeLog('warn', scope, msg, ctx),
    error: (msg, ctx) => writeLog('error', scope, msg, ctx),
    debug: (msg, ctx) => writeLog('debug', scope, msg, ctx)
  };
}

/** 测试用:重置路径缓存(让下次调用重新计算) */
export function __resetLoggerForTest(): void {
  logDir = undefined;
  logFilePath = undefined;
}

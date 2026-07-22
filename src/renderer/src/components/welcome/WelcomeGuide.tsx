import { useState } from 'react';
import logoUrl from '../../assets/logo.png';

/**
 * 欢迎引导页 - 首次打开时展示
 * 设计语言:与 LibraryPicker/AboutPage 保持一致
 * - 径向光晕背景 + 装饰光斑
 * - stagger fade-in-up 入场动画
 * - 3 列核心特性卡片(参考 AboutPage)
 * - 功能清单 + 快捷键卡片
 * - 底部胶囊形 CTA "开始使用"
 * 完成后通过 onFinished 回调,由父组件写入 localStorage 持久化标志
 *
 * 颜色说明:项目 CSS 变量为 --color-primary(值为 "0 122 255" 形式),
 * 必须通过 tailwind class(text-primary/bg-primary)或 rgb(var(--color-primary)) 使用,
 * 不能直接 var(--primary)。这里统一用 tailwind class + SVG stroke="currentColor"。
 */

// ============ 数据定义 ============

// 核心特性(3 列卡片)- 使用 tailwind class 控制颜色,SVG 用 currentColor 继承
const FEATURES = [
  {
    textCls: 'text-primary',
    bgCls: 'bg-primary/10',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: '本地优先',
    desc: '所有照片仅存于本机,无需联网,永不上传。',
  },
  {
    textCls: 'text-success',
    bgCls: 'bg-success/10',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: '隐私守护',
    desc: '无云端、无追踪、无广告,你的回忆只属于你。',
  },
  {
    textCls: 'text-warning',
    bgCls: 'bg-warning/10',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: '极速浏览',
    desc: '原生渲染与懒加载,万张图库依旧流畅。',
  },
];

// 主要功能清单(图标 + 标题 + 描述)- 统一 primary 色
const CAPABILITIES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
    title: '真实文件系统映射',
    desc: '相册即真实子目录,拖拽导入即文件移动,所见即所得。',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
    title: '30 天可恢复回收站',
    desc: '删除即移入回收站,30 天内可一键还原,过期自动清理。',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
    title: 'Ctrl + Z 撤销栈',
    desc: '误删误移不必慌,Ctrl + Z 随时回退上一步操作。',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    title: '视频图片统一管理',
    desc: '支持 JPG/HEIC/PNG 与 MP4/MOV 等,自动读取 EXIF 与视频元数据。',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: '多维搜索',
    desc: '按文件名、日期范围、EXIF 信息快速定位回忆。',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.6L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
    title: '文件热更新',
    desc: '自动监听库目录变化,外部新增/删除即时同步,无需手动刷新。',
  },
];

// 快捷操作卡片
const SHORTCUTS = [
  { keys: '双击 / 空格', desc: '放大查看图片' },
  { keys: 'Ctrl / Shift', desc: '多选图片' },
  { keys: '拖拽文件', desc: '导入到当前库' },
  { keys: 'Del', desc: '移入回收站' },
];

// ============ 主组件 ============
export default function WelcomeGuide({ onFinished }: { onFinished: () => void }) {
  const [finishing, setFinishing] = useState(false);

  function handleStart() {
    setFinishing(true);
    onFinished();
  }

  return (
    <div
      className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-background animate-fade-in"
      style={{
        // 径向光晕背景:中心品牌色微光,向外淡出
        background: `radial-gradient(circle at 50% 20%,
          rgba(0, 122, 255, 0.08) 0%,
          rgba(0, 122, 255, 0.03) 30%,
          transparent 60%)`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 装饰性背景光斑 */}
      <div
        className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(0, 122, 255, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="pointer-events-none fixed -bottom-32 -right-32 h-96 w-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(175, 82, 222, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* 中央内容区:max-width 880px,水平居中 */}
      <div className="relative mx-auto flex min-h-full max-w-[880px] flex-col items-center px-6 pb-16 pt-16">
        {/* ============ 1. Hero 区:Logo + 标题 + slogan ============ */}
        <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          {/* Logo - 80px 圆角方形 + float 悬浮动画 */}
          <img
            src={logoUrl}
            alt="拾光盒"
            className="h-20 w-20 rounded-[1.25rem] object-cover shadow-xl animate-float"
            draggable={false}
          />
          <div className="h-5" />
          <h1 className="text-center text-[32px] font-bold tracking-tight text-foreground">
            欢迎使用拾光盒
          </h1>
          <div className="h-1.5" />
          <p className="text-center text-[13px] font-medium uppercase tracking-[0.2em] text-muted-fg">
            Lumibox
          </p>
          <div className="h-3" />
          <p className="text-center text-[15px] text-muted-fg">
            把每一段时光,妥帖收存。
          </p>
          <p className="mt-1.5 text-center text-[13px] text-muted-fg/80">
            本地优先 · 隐私守护 · 极速浏览
          </p>
        </div>

        {/* 间距 48px */}
        <div className="h-12" />

        {/* ============ 2. 核心特性:3 列卡片 ============ */}
        <div
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up"
          style={{ animationDelay: '80ms' }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-background p-6">
              <div
                className={`mb-4 flex h-8 w-8 items-center justify-center rounded-full ${f.bgCls} ${f.textCls}`}
              >
                {f.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-[13px] font-normal leading-[1.5] text-muted-fg">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 间距 40px */}
        <div className="h-10" />

        {/* ============ 3. 主要功能清单 ============ */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-fg">
            主要功能
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="flex gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/30"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                >
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-[14px] font-semibold text-foreground">{c.title}</h5>
                  <p className="mt-1 text-[12.5px] font-normal leading-[1.5] text-muted-fg">
                    {c.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 间距 40px */}
        <div className="h-10" />

        {/* ============ 4. 快捷操作卡片 ============ */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <h4 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-fg">
            快捷操作
          </h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background p-4 text-center"
              >
                <kbd
                  className="inline-flex min-w-[64px] items-center justify-center rounded-md border border-border bg-muted px-2 py-1 text-[12px] font-medium text-foreground"
                >
                  {s.keys}
                </kbd>
                <span className="text-[12px] font-normal leading-[1.4] text-muted-fg">
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 间距 48px */}
        <div className="h-12" />

        {/* ============ 5. 开始使用 CTA ============ */}
        <div
          className="flex flex-col items-center gap-3 animate-fade-in-up"
          style={{ animationDelay: '320ms' }}
        >
          <button
            onClick={handleStart}
            disabled={finishing}
            className="flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground shadow-lg transition-all duration-300 ease-spring hover:bg-primary-hover hover:shadow-xl active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
          >
            {finishing ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                正在进入…
              </>
            ) : (
              <>
                开始使用
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
          <p className="text-[11px] text-muted-fg/70">
            接下来请选择一个文件夹作为你的照片库
          </p>
        </div>

        {/* 间距 32px */}
        <div className="h-8" />

        {/* 底部说明 */}
        <div
          className="flex items-center gap-1.5 text-[11px] text-muted-fg/70 animate-fade-in"
          style={{ animationDelay: '500ms' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          所有照片仅存储于本机,永不上传
        </div>
      </div>
    </div>
  );
}

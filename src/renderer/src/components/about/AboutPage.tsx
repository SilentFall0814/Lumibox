import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setView } from '../../store/uiSlice';
import logoUrl from '../../assets/logo.png';

/**
 * 关于拾光盒 - 设计稿规范:
 * - 180deg 渐变背景:muted → background
 * - 左上角 36px 圆形返回按钮(fixed top-6 left-6)
 * - 中央 max-width 720px
 * - 96px 圆角方形 logo + float 悬浮动画 + 阴影
 * - "拾光盒" 36px 700 -0.02em 字距
 * - "Lumibox" 15px 500 uppercase 0.1em 字距
 * - 版本号 13px
 * - tagline 15px max-width 400px
 * - 3 列特性卡片(本地优先/隐私守护/极速浏览)
 * - 技术栈 tag 胶囊
 * - 致谢区
 * - 底部版权 + 开源许可链接
 * 保留作者信息:SilentFall / 邮箱 / QQ
 */
export default function AboutPage() {
  const dispatch = useDispatch<AppDispatch>();

  const goBack = () => dispatch(setView('library'));

  return (
    <div
      className="relative h-full w-full overflow-y-auto overflow-x-hidden animate-fade-in"
      style={{
        // 渐变背景:需用 rgb() 包裹,--color-muted/--color-background 值为 RGB 三元组
        background: 'linear-gradient(180deg, rgb(var(--color-muted)) 0%, rgb(var(--color-background)) 100%)'
      }}
    >
      {/* 左上角 36px 圆形返回按钮 */}
      <button
        onClick={goBack}
        aria-label="返回"
        className="fixed left-6 top-6 z-50 flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-foreground/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {/* 中央内容区:max-width 720px,水平居中 */}
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-6 pb-12 pt-20">
        {/* 1. 应用图标:96px 圆角方形 + float 动画 */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] animate-float"
            style={{
              // logo 阴影需用 rgb() 包裹,--color-primary 值为 RGB 三元组
              boxShadow: '0 20px 50px color-mix(in srgb, rgb(var(--color-primary)) 25%, transparent)'
            }}
          >
            <img
              src={logoUrl}
              alt="拾光盒"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '1.5rem' }}
              draggable={false}
            />
          </div>
        </div>

        {/* 间距 24px */}
        <div className="h-6" />

        {/* 2. 标题区:拾光盒 + Lumibox + 版本 + tagline */}
        <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h1 className="text-center text-[36px] font-bold tracking-[-0.02em] text-foreground">
            拾光盒
          </h1>
          <div className="h-1" />
          <p className="text-center text-[15px] font-medium uppercase tracking-[0.1em] text-muted-fg">
            Lumibox
          </p>
          <div className="h-2" />
          <p className="text-center text-[13px] text-muted-fg">版本 V1.0.1</p>
          <div className="h-3" />
          <p
            className="text-center text-[15px] font-normal text-muted-fg"
            style={{ maxWidth: '400px' }}
          >
            本地优先的照片与视频管理,把回忆留在身边。
          </p>
        </div>

        {/* 间距 40px */}
        <div className="h-10" />

        {/* 3. 特性卡片区:3 列网格 */}
        <div
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          {/* 卡1: 本地优先 - 蓝色盾牌 */}
          <div className="rounded-lg border border-border bg-background p-6">
            <div
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">本地优先</h3>
            <p className="mt-2 text-[13px] font-normal leading-[1.5] line-clamp-3 text-muted-fg">
              所有照片仅存于本机,无需联网,永不上传。
            </p>
          </div>

          {/* 卡2: 隐私守护 - 绿色锁 */}
          <div className="rounded-lg border border-border bg-background p-6">
            <div
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">隐私守护</h3>
            <p className="mt-2 text-[13px] font-normal leading-[1.5] line-clamp-3 text-muted-fg">
              无云端、无追踪、无广告,你的回忆只属于你。
            </p>
          </div>

          {/* 卡3: 极速浏览 - 橙色闪电 */}
          <div className="rounded-lg border border-border bg-background p-6">
            <div
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-warning/10 text-warning"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">极速浏览</h3>
            <p className="mt-2 text-[13px] font-normal leading-[1.5] line-clamp-3 text-muted-fg">
              原生渲染与懒加载,万张图库依旧流畅。
            </p>
          </div>
        </div>

        {/* 间距 40px */}
        <div className="h-10" />

        {/* 4. 技术栈区 */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-fg">
            技术栈
          </h4>
          <div className="flex flex-wrap gap-2">
            {['Electron', 'React', 'TypeScript', 'SQLite', 'Rust', 'FFmpeg'].map((tech) => (
              <span
                key={tech}
                className="whitespace-nowrap rounded-full bg-muted px-3.5 py-1.5 text-[13px] font-medium text-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* 间距 32px */}
        <div className="h-8" />

        {/* 5. 作者信息区 */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-fg">
            作者
          </h4>
          <div className="rounded-lg border border-border bg-background p-5">
            <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-[auto_1fr]">
              <dt className="flex items-center gap-2 text-muted-fg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                作者
              </dt>
              <dd className="text-foreground">SilentFall</dd>

              <dt className="flex items-center gap-2 text-muted-fg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                邮箱
              </dt>
              <dd>
                <a
                  href="mailto:LJB110814@163.com"
                  className="text-primary transition-opacity hover:opacity-70"
                >
                  LJB110814@163.com
                </a>
              </dd>

              <dt className="flex items-center gap-2 text-muted-fg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                QQ
              </dt>
              <dd className="text-foreground tabular-nums">3552931982</dd>

              <dt className="flex items-center gap-2 text-muted-fg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
                GitHub
              </dt>
              <dd>
                <a
                  href="https://github.com/SilentFall0814"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary transition-opacity hover:opacity-70"
                >
                  github.com/SilentFall0814
                </a>
              </dd>
            </dl>
          </div>
        </div>

        {/* 间距 32px */}
        <div className="h-8" />

        {/* 6. 致谢区 */}
        <div className="w-full animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-fg">
            致谢
          </h4>
          <p className="text-[13px] font-normal leading-[1.6] text-muted-fg">
            感谢所有开源贡献者,以及让拾光盒成为可能的优秀开源项目。
          </p>
        </div>
      </div>
    </div>
  );
}

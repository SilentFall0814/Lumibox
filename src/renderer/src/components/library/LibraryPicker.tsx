import { useState } from 'react';
import { toast } from 'sonner';
import logoUrl from '../../assets/logo.png';

/**
 * 欢迎页 - 设计稿规范:
 * - 径向光晕背景
 * - 80px 圆角方形 logo + float 悬浮动画
 * - "拾光盒"标题 + "Lumibox" 小字
 * - slogan "把每一段时光,妥帖收存。"
 * - 副文案 "本地优先 · 隐私守护 · 极速浏览"
 * - 48px 胶囊形主 CTA "选择库目录"
 * - 底部说明 "所有照片仅存储于本机"
 * - stagger fade-in-up 入场
 */
export default function LibraryPicker() {
  const [busy, setBusy] = useState(false);

  async function handlePick() {
    setBusy(true);
    try {
      const dir = await window.lumibox.library.selectDirectory();
      if (!dir) return;
      const res = await window.lumibox.library.initLibrary(dir);
      if (res.ok) {
        toast.success('照片库已初始化');
        location.reload();
      } else {
        toast.error(res.error ?? '初始化失败');
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col items-center justify-center bg-background"
      style={{
        // 径向光晕背景:中心品牌色微光,向外淡出
        background: `radial-gradient(circle at 50% 40%,
          rgba(0, 122, 255, 0.08) 0%,
          rgba(0, 122, 255, 0.03) 30%,
          transparent 60%)`
      }}
    >
      {/* 装饰性背景光斑 */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(0, 122, 255, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(175, 82, 222, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)'
        }}
      />

      {/* ============ 主体内容 ============ */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Logo - 80px 圆角方形 + float 悬浮动画 */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <img
            src={logoUrl}
            alt="Lumibox"
            className="h-20 w-20 rounded-[1.25rem] object-cover shadow-xl animate-float"
            draggable={false}
          />
        </div>

        {/* 标题 + 副标题 */}
        <div
          className="flex flex-col items-center gap-1 animate-fade-in-up"
          style={{ animationDelay: '80ms' }}
        >
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">
            拾光盒
          </h1>
          <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-muted-fg">
            Lumibox
          </span>
        </div>

        {/* Slogan */}
        <p
          className="text-[15px] text-muted-fg animate-fade-in-up"
          style={{ animationDelay: '160ms' }}
        >
          把每一段时光,妥帖收存。
        </p>

        {/* 副文案 */}
        <p
          className="text-[13px] text-muted-fg/80 animate-fade-in-up"
          style={{ animationDelay: '240ms' }}
        >
          本地优先 · 隐私守护 · 极速浏览
        </p>

        {/* 主 CTA - 48px 高胶囊形 */}
        <button
          onClick={handlePick}
          disabled={busy}
          className="mt-2 flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-foreground shadow-lg transition-all duration-300 ease-spring hover:bg-primary-hover hover:shadow-xl active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none animate-fade-in-up"
          style={{ animationDelay: '320ms' }}
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              处理中…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              选择库目录
            </>
          )}
        </button>
      </div>

      {/* ============ 底部说明 ============ */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] text-muted-fg/70 animate-fade-in"
        style={{ animationDelay: '600ms' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        所有照片仅存储于本机
      </div>
    </div>
  );
}

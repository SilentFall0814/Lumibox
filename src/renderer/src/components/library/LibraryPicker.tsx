import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';

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
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-bg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">拾光盒 Lumibox</h1>
        <p className="mt-2 text-muted-fg">选择一个文件夹作为你的照片库根目录</p>
      </div>
      <Button onClick={handlePick} disabled={busy} size="md" className="px-8">
        {busy ? '处理中…' : '选择照片库目录'}
      </Button>
      <p className="max-w-md text-center text-xs text-muted-fg leading-relaxed">
        软件将在该目录下创建 .lumibox 系统目录(缩略图缓存、回收站、数据库),不会破坏原有文件结构。
      </p>
    </div>
  );
}

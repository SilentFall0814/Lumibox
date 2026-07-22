import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from './store';
import { setInitialized } from './store/librarySlice';
import { setScanProgress } from './store/uiSlice';
import { useTheme } from './hooks/useTheme';
import AppShell from './components/layout/AppShell';
import LibraryPicker from './components/library/LibraryPicker';
import WelcomeGuide from './components/welcome/WelcomeGuide';

// 首次引导的持久化 key(与 lumibox-theme 同风格,使用 localStorage)
const ONBOARDED_KEY = 'lumibox-onboarded';

export default function App() {
  const initialized = useSelector((s: RootState) => s.library.initialized);
  const [checking, setChecking] = useState(true);
  // 是否已完成首次引导(默认按 localStorage 判断,SSR 安全)
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const dispatch = useDispatch();
  // 初始化主题监听(明暗模式)
  useTheme();

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.lumibox.library.getConfig();
        if (cfg && cfg.currentLibraryId !== null) {
          dispatch(setInitialized(true));
        }
      } catch {
        // 忽略
      } finally {
        setChecking(false);
      }
    })();

    // 监听扫描进度
    window.lumibox.scan.onProgress((current, total) => {
      dispatch(setScanProgress({ current, total }));
    });
  }, [dispatch]);

  // 完成首次引导:写入 localStorage,切换状态
  const finishOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      // 忽略写入失败
    }
    setOnboarded(true);
  };

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center text-muted-fg">
        加载中…
      </div>
    );
  }

  // 首次打开且未完成引导:展示欢迎引导页
  // 无论是否已有库,只要 localStorage 没有 onboarded 标志就显示
  // 全新安装的用户看到引导 → 点击"开始使用" → 进入选库或主界面
  if (!onboarded) {
    return (
      <>
        <Toaster position="bottom-right" richColors closeButton />
        <WelcomeGuide onFinished={finishOnboarding} />
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      {initialized ? <AppShell /> : <LibraryPicker />}
    </>
  );
}

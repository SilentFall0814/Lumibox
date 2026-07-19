import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from './store';
import { setInitialized } from './store/librarySlice';
import { setScanProgress } from './store/uiSlice';
import { useTheme } from './hooks/useTheme';
import AppShell from './components/layout/AppShell';
import LibraryPicker from './components/library/LibraryPicker';

export default function App() {
  const initialized = useSelector((s: RootState) => s.library.initialized);
  const [checking, setChecking] = useState(true);
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

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center text-muted-fg">
        加载中…
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors closeButton />
      {initialized ? <AppShell /> : <LibraryPicker />}
    </>
  );
}

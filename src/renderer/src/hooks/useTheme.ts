import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { setTheme } from '../store/uiSlice';
import type { ThemeMode } from '../store/uiSlice';

/**
 * 主题管理 Hook
 * - 监听 Redux 中的 theme 状态(light/dark/auto)
 * - 在 html 元素上同步切换 .dark 类
 * - auto 模式跟随系统 prefers-color-scheme
 * - 持久化到 localStorage
 */
export function useTheme() {
  const theme = useSelector((s: RootState) => s.ui.theme);
  const dispatch = useDispatch<AppDispatch>();

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'auto' && media.matches);
      root.classList.toggle('dark', isDark);
    };

    apply();
    // auto 模式下监听系统主题变化
    if (theme === 'auto') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [theme]);

  // 启动时从 localStorage 恢复
  useEffect(() => {
    const saved = localStorage.getItem('lumibox-theme') as ThemeMode | null;
    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      dispatch(setTheme(saved));
    }
  }, [dispatch]);

  // 持久化
  useEffect(() => {
    localStorage.setItem('lumibox-theme', theme);
  }, [theme]);

  const changeTheme = (t: ThemeMode) => dispatch(setTheme(t));

  return { theme, changeTheme };
}

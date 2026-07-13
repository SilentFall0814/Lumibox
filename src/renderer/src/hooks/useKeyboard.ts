import { useEffect } from 'react';

interface KeyboardHandlers {
  onDelete?: () => void;
  onUndo?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSpace?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handlers.onDelete?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handlers.onUndo?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handlers.onSelectAll?.();
      } else if (e.key === 'Escape') {
        handlers.onEscape?.();
      } else if (e.key === 'ArrowRight') {
        handlers.onNext?.();
      } else if (e.key === 'ArrowLeft') {
        handlers.onPrev?.();
      } else if (e.key === ' ') {
        e.preventDefault();
        handlers.onSpace?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, handlers]);
}

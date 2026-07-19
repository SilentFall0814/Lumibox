import { useCallback, useEffect, useState } from 'react';

interface DragState {
  isOver: boolean;
  isCtrl: boolean;
}

/** 处理窗口拖入:默认移动,Ctrl 复制 */
export function useDragDrop(onDrop: (paths: string[], mode: 'move' | 'copy') => void) {
  const [state, setState] = useState<DragState>({ isOver: false, isCtrl: false });

  // 兜底:监听 document 的 dragend(capture 阶段,dragend 不冒泡)
  // 确保拖拽结束后 isOver 一定被重置,即使 drop 发生在其他组件(如拖到相册)
  useEffect(() => {
    const reset = () => setState({ isOver: false, isCtrl: false });
    document.addEventListener('dragend', reset, true);
    return () => document.removeEventListener('dragend', reset, true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 允许 drop
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
    setState({ isOver: true, isCtrl: e.ctrlKey });
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // 用 relatedTarget 判断是否真正离开了容器(relatedTarget 不在容器内)
    // 比原先的 currentTarget === target 判断更可靠,避免冒泡到子元素时误判
    const related = e.relatedTarget as Node | null;
    if (!related || !e.currentTarget.contains(related)) {
      setState({ isOver: false, isCtrl: false });
    }
  }, []);

  const onDropHandler = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ isOver: false, isCtrl: false });
    const files = e.dataTransfer.files;
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      // Electron 的 File 对象包含 path 属性
      const filePath = (f as unknown as { path: string }).path;
      if (filePath) paths.push(filePath);
    }
    if (paths.length > 0) {
      onDrop(paths, e.ctrlKey ? 'copy' : 'move');
    }
  }, [onDrop]);

  return { state, handlers: { onDragOver, onDragLeave, onDrop: onDropHandler } };
}

/** 相册作为 drop 目标 */
export function useAlbumDrop(onDropImages: (imageIds: number[]) => void) {
  const [isOver, setIsOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  }, []);

  const onDragLeave = useCallback(() => setIsOver(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const data = e.dataTransfer.getData('application/x-lumibox-images');
    if (data) {
      try {
        const ids = JSON.parse(data) as number[];
        onDropImages(ids);
      } catch { /* ignore */ }
    }
  }, [onDropImages]);

  return { isOver, handlers: { onDragOver, onDragLeave, onDrop } };
}

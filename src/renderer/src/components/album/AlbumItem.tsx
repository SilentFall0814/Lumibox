import { useAlbumDrop } from '../../hooks/useDragDrop';
import type { Album } from '../../../../shared/types';
import { cn } from '../../lib/utils';

interface AlbumItemProps {
  album: Album;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDropImages: (imageIds: number[]) => Promise<void>;
}

/**
 * 相册项 - 设计稿规范:
 * - 24×24 缩略图 + 名称 + 计数
 * - active 态:3px 蓝色左竖条 + 蓝色文字
 * - 9 高度 / 13px 字号
 */
export default function AlbumItem({ album, selected, onSelect, onDelete, onDropImages }: AlbumItemProps) {
  const drop = useAlbumDrop(onDropImages);
  return (
    <button
      className={cn(
        'group relative flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200 ease-spring',
        'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
        selected
          ? 'text-primary bg-primary-bg/60'
          : 'text-foreground/80 hover:text-foreground',
        drop.isOver && 'ring-1 ring-primary'
      )}
      onClick={onSelect}
      onContextMenu={(e) => { e.preventDefault(); onDelete(); }}
      {...drop.handlers}
    >
      {/* active 左竖条 */}
      {selected && (
        <span className="absolute left-0 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      {/* 相册图标(替代缩略图,简化实现) */}
      <svg
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.6"
        className={cn('flex-shrink-0 transition-colors', selected ? 'text-primary' : 'text-muted-fg group-hover:text-foreground')}
      >
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
      <span className="flex-1 truncate text-left">{album.name}</span>
      <span className="text-[11px] text-muted-fg tabular-nums">{album.imageCount}</span>
    </button>
  );
}

import { useState } from 'react';
import { toast } from 'sonner';
import { useAlbumDrop } from '../../hooks/useDragDrop';
import type { Album } from '../../../../shared/types';

interface AlbumItemProps {
  album: Album;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDropImages: (imageIds: number[]) => Promise<void>;
}

export default function AlbumItem({ album, selected, onSelect, onDelete, onDropImages }: AlbumItemProps) {
  const drop = useAlbumDrop(onDropImages);
  return (
    <div
      className={`group flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm hover:bg-muted ${
        selected ? 'bg-primary-bg text-primary' : 'text-foreground'
      } ${drop.isOver ? 'ring-1 ring-primary' : ''}`}
      onClick={onSelect}
      onContextMenu={(e) => { e.preventDefault(); onDelete(); }}
      {...drop.handlers}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
      <span className="flex-1 truncate">{album.name}</span>
      <span className="text-xs text-muted-fg">{album.imageCount}</span>
    </div>
  );
}

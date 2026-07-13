import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { formatBytes, formatDate, formatDuration } from '../../lib/utils';
import TagEditor from '../tag/TagEditor';
import type { ImageRecord, ExifData } from '../../../../shared/types';

export default function RightPanel() {
  const selectedIds = useSelector((s: RootState) => s.selection.selectedIds);
  const items = useSelector((s: RootState) => s.images.items);
  const searchResults = useSelector((s: RootState) => s.images.searchResults);

  const imageId = selectedIds[0];
  const allItems = searchResults ?? items;
  const image: ImageRecord | undefined = allItems.find((i) => i.id === imageId);
  const [exif, setExif] = useState<ExifData>({});

  useEffect(() => {
    if (!image) { setExif({}); return; }
    window.lumibox.image.getExif(image.id).then(setExif).catch(() => setExif({}));
  }, [image?.id]);

  if (selectedIds.length === 0) {
    return (
      <aside className="flex w-80 flex-col border-l border-border bg-background p-4">
        <p className="text-sm text-muted-fg">未选择图片</p>
      </aside>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <aside className="flex w-80 flex-col border-l border-border bg-background p-4">
        <p className="text-sm text-foreground">已选择 {selectedIds.length} 张图片</p>
      </aside>
    );
  }

  if (!image) return null;

  return (
    <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-l border-border bg-background p-4">
      {/* 图片信息 */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-fg">
          {image.type === 'video' ? '视频信息' : '图片信息'}
        </h3>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-fg">名称</dt>
            <dd className="truncate ml-2 text-foreground" title={image.name}>{image.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">大小</dt>
            <dd className="text-foreground">{formatBytes(image.size)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">时间</dt>
            <dd className="text-foreground">{formatDate(image.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">路径</dt>
            <dd className="truncate ml-2 text-foreground" title={image.path}>{image.path}</dd>
          </div>
          {image.width && image.height && (
            <div className="flex justify-between">
              <dt className="text-muted-fg">尺寸</dt>
              <dd className="text-foreground">{image.width} × {image.height}</dd>
            </div>
          )}
          {image.type === 'video' && image.duration && (
            <div className="flex justify-between">
              <dt className="text-muted-fg">时长</dt>
              <dd className="text-foreground">{formatDuration(image.duration)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* EXIF */}
      {(exif.camera || exif.lens) && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-fg">EXIF</h3>
          <dl className="flex flex-col gap-1 text-sm">
            {exif.camera && (
              <div className="flex justify-between">
                <dt className="text-muted-fg">相机</dt>
                <dd className="text-foreground">{exif.camera}</dd>
              </div>
            )}
            {exif.lens && (
              <div className="flex justify-between">
                <dt className="text-muted-fg">镜头</dt>
                <dd className="text-foreground">{exif.lens}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <div className="h-px bg-border" />

      {/* 标签编辑 */}
      <TagEditor />
    </aside>
  );
}

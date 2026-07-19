import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { RootState, AppDispatch } from '../../store';
import { clearSelection } from '../../store/selectionSlice';
import { removeImages } from '../../store/imagesSlice';
import { formatBytes, formatDate, formatDuration, formatBitrate } from '../../lib/utils';
import { ConfirmDialog } from '../ui/dialog';
import type { ImageRecord, ExifData } from '../../../../shared/types';

/**
 * 右侧信息面板 - 设计稿规范:
 * - 280px 宽,毛玻璃背景
 * - 4/3 比例预览图(1.2rem 圆角)
 * - 文件名(粗体)
 * - 信息列表(label/value 横向排列,13px 字号)
 * - 分隔线
 * - 删除(浅红底+红字)胶囊按钮
 * - 从右滑入动画
 *
 * 性能:用 useMemo 构建 id → ImageRecord 索引,避免每次渲染 O(n) find
 */

// 用自定义 lumibox:// 协议加载库内原图
function buildImageUrl(relPath: string): string {
  return `lumibox://img/${encodeURIComponent(relPath)}`;
}

export default function RightPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedIds = useSelector((s: RootState) => s.selection.selectedIds);
  const items = useSelector((s: RootState) => s.images.items);
  const searchResults = useSelector((s: RootState) => s.images.searchResults);

  const allItems = searchResults ?? items;
  // 用 Map 索引代替 find,O(1) 查找
  const itemsMap = useMemo(() => {
    const m = new Map<number, ImageRecord>();
    for (const it of allItems) m.set(it.id, it);
    return m;
  }, [allItems]);

  const imageId = selectedIds[0];
  const image: ImageRecord | undefined = imageId != null ? itemsMap.get(imageId) : undefined;
  const [exif, setExif] = useState<ExifData>({});
  // 删除确认对话框开关
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!image) { setExif({}); return; }
    window.lumibox.image.getExif(image.id).then(setExif).catch(() => setExif({}));
  }, [image?.id]);

  // ============ 删除逻辑 ============
  // 弹出确认对话框
  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    setConfirmDelete(true);
  }, [selectedIds.length]);

  // 确认删除:调用主进程 deleteMany + 推入 undo 栈 + 更新 Redux
  const confirmDeleteAction = useCallback(async () => {
    setConfirmDelete(false);
    try {
      const result = await window.lumibox.image.deleteMany(selectedIds);
      await window.lumibox.undo.pushUndo({
        type: 'delete',
        data: { trashIds: result.trashIds }
      });
      dispatch(removeImages(selectedIds));
      dispatch(clearSelection());
      toast.success(`已删除 ${result.deleted} 项,可从回收站恢复`);
    } catch (e) {
      toast.error('删除失败: ' + (e as Error).message);
    }
  }, [selectedIds, dispatch]);

  // 未选中任何项
  if (selectedIds.length === 0) {
    return (
      <aside className="flex w-[280px] flex-shrink-0 flex-col items-center justify-center glass border-l border-border/40 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-fg">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <p className="text-[13px] text-muted-fg">选择图片以查看详情</p>
        </div>
      </aside>
    );
  }

  // 多选 - 显示选中数量
  if (selectedIds.length > 1) {
    // 多选时按类型统计(用 Map 查找,避免 O(n²) find)
    let imageCount = 0;
    let videoCount = 0;
    for (const id of selectedIds) {
      const it = itemsMap.get(id);
      if (!it) continue;
      if (it.type === 'video') videoCount++;
      else imageCount++;
    }
    let label: string;
    if (imageCount > 0 && videoCount > 0) {
      label = `已选择 ${selectedIds.length} 项`;
    } else if (videoCount > 0) {
      label = `已选择 ${selectedIds.length} 个视频`;
    } else {
      label = `已选择 ${selectedIds.length} 张图片`;
    }
    return (
      <aside className="flex w-[280px] flex-shrink-0 flex-col items-center justify-center glass border-l border-border/40 p-6 animate-slide-in-right">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-bg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
      </aside>
    );
  }

  if (!image) return null;

  const isVideo = image.type === 'video';
  const videoWidth = image.width ?? exif.width;
  const videoHeight = image.height ?? exif.height;
  const videoDuration = image.duration ?? exif.duration;
  const videoFps = image.fps ?? exif.fps;
  const videoBitrate = image.bitrate ?? exif.bitrate;

  return (
    <>
    <aside className="flex w-[280px] flex-shrink-0 flex-col overflow-y-auto glass border-l border-border/40 p-4 animate-slide-in-right">
      {/* ============ 4/3 比例预览图 ============ */}
      <div className="relative w-full overflow-hidden rounded-lg bg-muted shadow-sm">
        <div className="aspect-[4/3] w-full">
          {image.type === 'image' ? (
            <img
              src={buildImageUrl(image.path)}
              alt={image.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black">
              <video
                src={buildImageUrl(image.path)}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
            </div>
          )}
        </div>
        {/* 视频播放标识 */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="m8 5 12 7-12 7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* ============ 文件名 ============ */}
      <h3 className="mt-3 truncate text-[13px] font-semibold text-foreground" title={image.name}>
        {image.name}
      </h3>

      {/* ============ 信息列表 ============ */}
      <dl className="mt-3 flex flex-col gap-1.5">
        {([
          { label: '大小', value: formatBytes(image.size) },
          { label: '时间', value: formatDate(image.createdAt) },
          ...(!isVideo && image.width && image.height
            ? [{ label: '尺寸', value: `${image.width} × ${image.height}` }]
            : [])
        ] as { label: string; value: string }[]).map((row, idx) => (
          <div
            key={row.label}
            className="stagger-item flex items-baseline justify-between gap-2 text-[13px]"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <dt className="flex-shrink-0 text-muted-fg">{row.label}</dt>
            <dd className="truncate text-foreground text-right" title={row.value}>{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* ============ 视频参数 ============ */}
      {isVideo && (
        <dl className="mt-3 flex flex-col gap-1.5 animate-fade-in-up">
          <h4 className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-fg">
            视频参数
          </h4>
          {([
            videoWidth && videoHeight ? { label: '分辨率', value: `${videoWidth} × ${videoHeight}` } : null,
            videoDuration !== undefined ? { label: '时长', value: formatDuration(videoDuration) } : null,
            videoFps !== undefined ? { label: '帧率', value: `${videoFps} fps` } : null,
            videoBitrate !== undefined ? { label: '码率', value: formatBitrate(videoBitrate) } : null
          ].filter(Boolean) as { label: string; value: string }[]).map((row, idx) => (
            <div
              key={row.label}
              className="stagger-item flex items-baseline justify-between gap-2 text-[13px]"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <dt className="flex-shrink-0 text-muted-fg">{row.label}</dt>
              <dd className="text-foreground tabular-nums text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* ============ EXIF ============ */}
      {(exif.camera || exif.lens) && (
        <dl className="mt-3 flex flex-col gap-1.5">
          <h4 className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-fg">EXIF</h4>
          {exif.camera && (
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <dt className="flex-shrink-0 text-muted-fg">相机</dt>
              <dd className="truncate text-foreground text-right" title={exif.camera}>{exif.camera}</dd>
            </div>
          )}
          {exif.lens && (
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <dt className="flex-shrink-0 text-muted-fg">镜头</dt>
              <dd className="truncate text-foreground text-right" title={exif.lens}>{exif.lens}</dd>
            </div>
          )}
        </dl>
      )}

      {/* ============ 分隔线 ============ */}
      <div className="my-4 h-px bg-border/60" />

      {/* ============ 操作按钮(仅保留删除)============ */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleDelete}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-red-50 text-[13px] font-medium text-danger transition-all duration-300 ease-spring hover:bg-red-100 active:scale-[0.96] dark:bg-red-950/40 dark:hover:bg-red-900/40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          删除
        </button>
      </div>
    </aside>

    {/* ============ 删除确认对话框 ============ */}
    <ConfirmDialog
      open={confirmDelete}
      title="确认删除"
      description={`确定将「${image.name}」移到回收站?可从回收站恢复,或按 Ctrl+Z 撤销。`}
      confirmText="删除"
      variant="danger"
      onConfirm={confirmDeleteAction}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  );
}

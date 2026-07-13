import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { toggleSelect, selectRange, selectMany, clearSelection } from '../store/selectionSlice';
import type { ImageRecord } from '../../../shared/types';

interface UseMultiSelectReturn {
  selectedIds: number[];
  lastSelectedId: number | null;
  handleSelect: (image: ImageRecord, e: React.MouseEvent) => void;
  handleClear: () => void;
  selectAll: (allIds: number[]) => void;
}

export function useMultiSelect(allImages: ImageRecord[]): UseMultiSelectReturn {
  const dispatch = useDispatch<AppDispatch>();
  const selectedIds = useSelector((s: RootState) => s.selection.selectedIds);
  const lastSelectedId = useSelector((s: RootState) => s.selection.lastSelectedId);
  const allIdsRef = useRef<number[]>([]);

  useEffect(() => {
    allIdsRef.current = allImages.map((i) => i.id);
  }, [allImages]);

  const handleSelect = useCallback((image: ImageRecord, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      dispatch(toggleSelect(image.id));
    } else if (e.shiftKey && lastSelectedId !== null) {
      dispatch(selectRange({
        from: lastSelectedId,
        to: image.id,
        allIds: allIdsRef.current
      }));
    } else {
      dispatch(selectMany([image.id]));
    }
  }, [dispatch, lastSelectedId]);

  const handleClear = useCallback(() => dispatch(clearSelection()), [dispatch]);

  const selectAll = useCallback((allIds: number[]) => {
    dispatch(selectMany(allIds));
  }, [dispatch]);

  return { selectedIds, lastSelectedId, handleSelect, handleClear, selectAll };
}

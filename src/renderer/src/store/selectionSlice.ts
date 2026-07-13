import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface SelectionState {
  selectedIds: number[];
  lastSelectedId: number | null;
}

const initialState: SelectionState = { selectedIds: [], lastSelectedId: null };

const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    toggleSelect(state, action: PayloadAction<number>) {
      const id = action.payload;
      const idx = state.selectedIds.indexOf(id);
      if (idx >= 0) state.selectedIds.splice(idx, 1);
      else state.selectedIds.push(id);
      state.lastSelectedId = id;
    },
    selectRange(state, action: PayloadAction<{ from: number; to: number; allIds: number[] }>) {
      const { from, to, allIds } = action.payload;
      const fromIdx = allIds.indexOf(from);
      const toIdx = allIds.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return;
      const [start, end] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      state.selectedIds = allIds.slice(start, end + 1);
      state.lastSelectedId = to;
    },
    selectMany(state, action: PayloadAction<number[]>) {
      state.selectedIds = action.payload;
      state.lastSelectedId = action.payload[action.payload.length - 1] ?? null;
    },
    clearSelection(state) {
      state.selectedIds = [];
      state.lastSelectedId = null;
    }
  }
});

export const { toggleSelect, selectRange, selectMany, clearSelection } = selectionSlice.actions;
export default selectionSlice.reducer;

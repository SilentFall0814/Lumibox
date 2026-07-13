import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ImageRecord } from '../../../shared/types';

interface ImagesState {
  items: ImageRecord[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
  searchResults: ImageRecord[] | null;
}

const initialState: ImagesState = {
  items: [],
  total: 0,
  page: 0,
  pageSize: 100,
  hasMore: false,
  loading: false,
  searchResults: null
};

const imagesSlice = createSlice({
  name: 'images',
  initialState,
  reducers: {
    setImages(state, action: PayloadAction<{ items: ImageRecord[]; total: number; page: number; hasMore: boolean }>) {
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.hasMore = action.payload.hasMore;
    },
    appendImages(state, action: PayloadAction<{ items: ImageRecord[]; page: number; hasMore: boolean }>) {
      state.items.push(...action.payload.items);
      state.page = action.payload.page;
      state.hasMore = action.payload.hasMore;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    removeImages(state, action: PayloadAction<number[]>) {
      state.items = state.items.filter((i) => !action.payload.includes(i.id));
      state.total = Math.max(0, state.total - action.payload.length);
    },
    setSearchResults(state, action: PayloadAction<ImageRecord[] | null>) {
      state.searchResults = action.payload;
    }
  }
});

export const { setImages, appendImages, setLoading, removeImages, setSearchResults } = imagesSlice.actions;
export default imagesSlice.reducer;

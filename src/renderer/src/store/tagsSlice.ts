import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Tag } from '../../../shared/types';

interface TagsState {
  all: Tag[];
  byImage: Record<number, Tag[]>;
}

const initialState: TagsState = { all: [], byImage: {} };

const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    setTags(state, action: PayloadAction<Tag[]>) {
      state.all = action.payload;
    },
    setTagsByImage(state, action: PayloadAction<{ imageId: number; tags: Tag[] }>) {
      state.byImage[action.payload.imageId] = action.payload.tags;
    }
  }
});

export const { setTags, setTagsByImage } = tagsSlice.actions;
export default tagsSlice.reducer;

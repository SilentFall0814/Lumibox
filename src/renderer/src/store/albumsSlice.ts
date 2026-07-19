import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Album } from '../../../shared/types';

interface AlbumsState {
  folders: Album[];
}

const initialState: AlbumsState = { folders: [] };

const albumsSlice = createSlice({
  name: 'albums',
  initialState,
  reducers: {
    setFolders(state, action: PayloadAction<Album[]>) {
      state.folders = action.payload;
    }
  }
});

export const { setFolders } = albumsSlice.actions;
export default albumsSlice.reducer;

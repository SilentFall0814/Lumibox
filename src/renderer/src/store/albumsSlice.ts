import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Album, VirtualAlbum } from '../../../shared/types';

interface AlbumsState {
  folders: Album[];
  virtualAlbums: VirtualAlbum[];
}

const initialState: AlbumsState = { folders: [], virtualAlbums: [] };

const albumsSlice = createSlice({
  name: 'albums',
  initialState,
  reducers: {
    setFolders(state, action: PayloadAction<Album[]>) {
      state.folders = action.payload;
    },
    setVirtualAlbums(state, action: PayloadAction<VirtualAlbum[]>) {
      state.virtualAlbums = action.payload;
    }
  }
});

export const { setFolders, setVirtualAlbums } = albumsSlice.actions;
export default albumsSlice.reducer;

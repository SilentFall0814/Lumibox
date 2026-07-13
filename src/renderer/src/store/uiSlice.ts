import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type View = 'library' | 'album' | 'virtual-album' | 'tag' | 'trash' | 'search';

interface UiState {
  currentView: View;
  currentPath: string;
  selectedAlbum: string | null;
  selectedTagId: number | null;
  searchQuery: string;
  fullscreenImageId: number | null;
  filterPanelOpen: boolean;
  scanProgress: { current: number; total: number } | null;
  // 图片列表重载信号:每次 dispatch triggerReload 递增,ImageGrid 监听变化后重载
  // 用于跨组件触发刷新(如把图片拖到相册后,源目录需移除这些图片)
  reloadNonce: number;
}

const initialState: UiState = {
  currentView: 'library',
  currentPath: '',
  selectedAlbum: null,
  selectedTagId: null,
  searchQuery: '',
  fullscreenImageId: null,
  filterPanelOpen: false,
  scanProgress: null,
  reloadNonce: 0
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<View>) {
      state.currentView = action.payload;
    },
    setCurrentPath(state, action: PayloadAction<string>) {
      state.currentPath = action.payload;
    },
    setSelectedAlbum(state, action: PayloadAction<string | null>) {
      state.selectedAlbum = action.payload;
    },
    setSelectedTagId(state, action: PayloadAction<number | null>) {
      state.selectedTagId = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setFullscreenImage(state, action: PayloadAction<number | null>) {
      state.fullscreenImageId = action.payload;
    },
    toggleFilterPanel(state) {
      state.filterPanelOpen = !state.filterPanelOpen;
    },
    setScanProgress(state, action: PayloadAction<{ current: number; total: number } | null>) {
      state.scanProgress = action.payload;
    },
    triggerReload(state) {
      state.reloadNonce += 1;
    }
  }
});

export const {
  setView, setCurrentPath, setSelectedAlbum, setSelectedTagId,
  setSearchQuery, setFullscreenImage, toggleFilterPanel, setScanProgress, triggerReload
} = uiSlice.actions;
export default uiSlice.reducer;
